/**
 * Imports Claude's combined Dari-quality-fix + answer-option-translation
 * batch (see scripts/prompts/dari-improvement-prompt.md and
 * export-for-dari-improvement.ts):
 *   - Replaces question_translations' Dari row with the simpler retranslation.
 *   - Replaces question_explanations' Dari row (source stays ai_generated).
 *   - Updates question_vocabulary.dari_meaning, matched positionally (same
 *     order as exported) since vocabulary has no natural unique key.
 *   - Upserts question_option_translations for en/dari/he (first time these
 *     exist for most options).
 *
 * Usage:
 *   npm run import:dari-improvement -- --email=you@example.com [--dir=path]
 *
 * Reads every *.json file in --dir (default:
 * supabase/seed/dari-improvement/results/). Safe to re-run: every write is
 * an upsert/update, never an insert of a new row.
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

interface ExplanationDariBlock {
  summary: string;
  whyCorrect: string;
  whyIncorrect: string | null;
  commonTrap: string | null;
  testedConcept: string | null;
}

interface OptionTranslationItem {
  label: string;
  en?: string | null;
  dari?: string | null;
  he?: string | null;
}

interface ResultItem {
  id: string;
  questionTranslationDari: string;
  explanationDari: ExplanationDariBlock | null;
  vocabularyDari: string[];
  optionTranslations: OptionTranslationItem[];
}

const OPTION_LANGS = ["en", "dari", "he"] as const;

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run import:dari-improvement -- --email=you@example.com [--dir=path]");
    process.exit(1);
  }
  const dir = resolve(process.cwd(), args.get("dir") ?? "supabase/seed/dari-improvement/results");
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

  const { data: allOptions, error: oError } = await supabase
    .from("question_options")
    .select("id, question_id, label")
    .eq("owner_id", userId);
  if (oError) throw oError;
  const optionIdByQuestionAndLabel = new Map<string, string>();
  for (const o of allOptions ?? []) {
    optionIdByQuestionAndLabel.set(`${o.question_id}:${o.label}`, o.id);
  }

  const { data: allVocab, error: vError } = await supabase
    .from("question_vocabulary")
    .select("id, question_id, sort_order")
    .eq("owner_id", userId);
  if (vError) throw vError;
  const vocabIdsByQuestion = new Map<string, string[]>();
  for (const v of [...(allVocab ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!vocabIdsByQuestion.has(v.question_id)) vocabIdsByQuestion.set(v.question_id, []);
    vocabIdsByQuestion.get(v.question_id)!.push(v.id);
  }

  let imported = 0;
  let failed = 0;

  for (const file of files) {
    const items: ResultItem[] = JSON.parse(readFileSync(resolve(dir, file), "utf-8"));
    console.log(`${file}: ${items.length} item(s)`);

    for (const item of items) {
      if (!item.id || !ownIds.has(item.id)) {
        console.error(`  Skipping unknown/foreign question id: ${item.id}`);
        failed++;
        continue;
      }

      try {
        if (item.questionTranslationDari && item.questionTranslationDari.trim()) {
          const { error } = await supabase.from("question_translations").upsert(
            {
              question_id: item.id,
              owner_id: userId,
              language: "dari",
              translated_text: item.questionTranslationDari.trim(),
            },
            { onConflict: "question_id,language" }
          );
          if (error) throw error;
        }

        if (item.explanationDari) {
          const block = item.explanationDari;
          const { error } = await supabase.from("question_explanations").upsert(
            {
              question_id: item.id,
              owner_id: userId,
              language: "dari",
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
          if (error) throw error;
        }

        const vocabIds = vocabIdsByQuestion.get(item.id) ?? [];
        for (let i = 0; i < (item.vocabularyDari ?? []).length; i++) {
          const meaning = item.vocabularyDari[i];
          const vocabId = vocabIds[i];
          if (!vocabId) {
            console.error(`  No matching vocabulary row at index ${i} for question ${item.id} — skipping`);
            continue;
          }
          if (!meaning || !meaning.trim()) continue;
          const { error } = await supabase
            .from("question_vocabulary")
            .update({ dari_meaning: meaning.trim() })
            .eq("id", vocabId);
          if (error) throw error;
        }

        for (const opt of item.optionTranslations ?? []) {
          const optionId = optionIdByQuestionAndLabel.get(`${item.id}:${opt.label}`);
          if (!optionId) {
            console.error(`  No matching option "${opt.label}" for question ${item.id} — skipping`);
            continue;
          }
          for (const lang of OPTION_LANGS) {
            const text = opt[lang];
            if (!text || !text.trim()) continue;
            const { error } = await supabase.from("question_option_translations").upsert(
              { question_option_id: optionId, owner_id: userId, language: lang, translated_text: text.trim() },
              { onConflict: "question_option_id,language" }
            );
            if (error) throw error;
          }
        }

        imported++;
      } catch (err) {
        console.error(`  Failed for ${item.id}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }
  }

  console.log(`\nDone. Imported ${imported} question(s), ${failed} failure(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
