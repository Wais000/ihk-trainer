/**
 * Imports Claude-generated full question enrichment (see
 * scripts/prompts/question-enrichment-prompt.md and
 * export-questions-for-enrichment.ts) — explanations in all 4 languages,
 * vocabulary, topic/difficulty classification, and a question translation
 * — an offline alternative to generating all of this live via Gemini.
 *
 * Usage:
 *   npm run import:enrichment -- --email=you@example.com [--dir=path]
 *
 * Reads every *.json file in --dir (default:
 * supabase/seed/question-enrichment/results/). Each file must be a JSON
 * array matching scripts/prompts/question-enrichment-prompt.md's output
 * format. Safe to re-run: every write is an upsert (or a delete+insert for
 * vocabulary, which has no natural unique key), so re-importing the same
 * file just overwrites with the same content.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ExplanationBlock {
  summary: string;
  whyCorrect: string;
  whyIncorrect: string;
  commonTrap: string | null;
  testedConcept: string | null;
}

interface VocabItem {
  germanWord: string;
  english?: string | null;
  dari?: string | null;
  hebrew?: string | null;
  shortGermanExplanation?: string | null;
}

interface EnrichmentItem {
  id: string;
  topic: string;
  subtopic: string | null;
  difficulty: number;
  examKeywords: string[];
  explanation: {
    de: ExplanationBlock;
    en: ExplanationBlock;
    dari: ExplanationBlock;
    he: ExplanationBlock;
  };
  vocabulary: VocabItem[];
  questionTranslation: { en?: string; dari?: string; he?: string };
}

const EXPLANATION_LANGS = ["de", "en", "dari", "he"] as const;
const TRANSLATION_LANGS = ["en", "dari", "he"] as const;

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run import:enrichment -- --email=you@example.com [--dir=path]");
    process.exit(1);
  }
  const dir = resolve(process.cwd(), args.get("dir") ?? "supabase/seed/question-enrichment/results");
  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let userId: string | null = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      userId = found.id;
      break;
    }
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error(`No Supabase auth user found with email ${email}`);
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No .json files found in ${dir}`);
    process.exit(1);
  }

  const { data: ownQuestions, error: qError } = await supabase.from("questions").select("id").eq("user_id", userId);
  if (qError) throw qError;
  const ownIds = new Set((ownQuestions ?? []).map((q) => q.id));

  const topicCache = new Map<string, string | null>();
  async function ensureTopic(topicName: string): Promise<string | null> {
    const slug = slugify(topicName);
    if (topicCache.has(slug)) return topicCache.get(slug)!;

    const { data: existing } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      topicCache.set(slug, existing.id);
      return existing.id;
    }

    const { data: created, error } = await supabase.from("topics").insert({ name: topicName, slug }).select("id").single();
    const id = error ? null : created.id;
    topicCache.set(slug, id);
    return id;
  }

  let imported = 0;
  let failed = 0;

  for (const file of files) {
    const items: EnrichmentItem[] = JSON.parse(readFileSync(resolve(dir, file), "utf-8"));
    console.log(`${file}: ${items.length} item(s)`);

    for (const item of items) {
      if (!item.id || !ownIds.has(item.id)) {
        console.error(`  Skipping unknown/foreign question id: ${item.id}`);
        failed++;
        continue;
      }

      try {
        const topicId = await ensureTopic(item.topic);

        const { error: updateError } = await supabase
          .from("questions")
          .update({
            topic_id: topicId,
            subtopic: item.subtopic,
            difficulty: item.difficulty,
            exam_keywords: item.examKeywords,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (updateError) throw updateError;

        for (const lang of EXPLANATION_LANGS) {
          const block = item.explanation[lang];
          const { error: expError } = await supabase.from("question_explanations").upsert(
            {
              question_id: item.id,
              owner_id: userId,
              language: lang,
              source: "ai_generated" as const,
              summary: block.summary,
              why_correct: block.whyCorrect,
              why_incorrect: block.whyIncorrect,
              common_trap: block.commonTrap,
              tested_concept: block.testedConcept,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "question_id,language" }
          );
          if (expError) throw expError;
        }

        await supabase.from("question_vocabulary").delete().eq("question_id", item.id);
        if (item.vocabulary.length > 0) {
          const { error: vocabError } = await supabase.from("question_vocabulary").insert(
            item.vocabulary.map((v, idx) => ({
              question_id: item.id,
              owner_id: userId,
              german_word: v.germanWord,
              english_meaning: v.english ?? null,
              dari_meaning: v.dari ?? null,
              hebrew_meaning: v.hebrew ?? null,
              short_german_explanation: v.shortGermanExplanation ?? null,
              sort_order: idx,
            }))
          );
          if (vocabError) throw vocabError;
        }

        for (const lang of TRANSLATION_LANGS) {
          const text = item.questionTranslation[lang];
          if (!text || !text.trim()) continue;
          const { error: transError } = await supabase.from("question_translations").upsert(
            { question_id: item.id, owner_id: userId, language: lang, translated_text: text.trim() },
            { onConflict: "question_id,language" }
          );
          if (transError) throw transError;
        }

        imported++;
      } catch (err) {
        console.error(`  Failed for ${item.id}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }
  }

  console.log(`\nDone. Enriched ${imported} question(s), ${failed} failure(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
