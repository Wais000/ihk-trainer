/**
 * Translates each question's existing German explanation into
 * English/Dari/Hebrew via Azure Translator — no LLM involved. Useful when
 * every question already has a real German explanation (e.g. via
 * import-explanations.ts) and only the other languages are missing; skips
 * Gemini entirely, so it's unaffected by that provider's availability.
 *
 * Usage:
 *   npm run translate:explanations -- --email=you@example.com
 *
 * Safe to re-run: skips any question that already has all three languages.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { translateManyFromGerman } from "../src/lib/translation/azure-translator";

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
    const match = arg.match(/^--([a-z]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

const TARGETS: { lang: "en" | "dari" | "he"; azureCode: string }[] = [
  { lang: "en", azureCode: "en" },
  { lang: "dari", azureCode: "prs" },
  { lang: "he", azureCode: "he" },
];

const REQUEST_INTERVAL_MS = 3000;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run translate:explanations -- --email=you@example.com");
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

  const { data: explanations, error } = await supabase
    .from("question_explanations")
    .select("question_id, language, summary, why_correct, why_incorrect, common_trap")
    .eq("owner_id", userId);
  if (error) throw error;

  const byQuestion = new Map<string, typeof explanations>();
  for (const row of explanations ?? []) {
    if (!byQuestion.has(row.question_id)) byQuestion.set(row.question_id, []);
    byQuestion.get(row.question_id)!.push(row);
  }

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  let isFirst = true;
  for (const [questionId, rows] of byQuestion) {
    const german = rows.find((r) => r.language === "de");
    if (!german) continue;

    const missing = TARGETS.filter((t) => !rows.some((r) => r.language === t.lang));
    if (missing.length === 0) {
      skipped++;
      continue;
    }

    if (!isFirst) await sleep(REQUEST_INTERVAL_MS);
    isFirst = false;

    const fields: { key: "summary" | "whyCorrect" | "whyIncorrect" | "commonTrap"; value: string }[] = [];
    fields.push({ key: "summary", value: german.summary });
    if (german.why_correct) fields.push({ key: "whyCorrect", value: german.why_correct });
    if (german.why_incorrect) fields.push({ key: "whyIncorrect", value: german.why_incorrect });
    if (german.common_trap) fields.push({ key: "commonTrap", value: german.common_trap });

    try {
      const results = await translateManyFromGerman(
        fields.map((f) => f.value),
        missing.map((m) => m.azureCode)
      );

      for (const { lang, azureCode } of missing) {
        const block: Partial<Record<string, string>> = {};
        fields.forEach((field, i) => {
          const text = results[i][azureCode];
          if (text) block[field.key] = text;
        });

        const { error: upsertError } = await supabase.from("question_explanations").upsert(
          {
            question_id: questionId,
            owner_id: userId,
            language: lang,
            source: "source" as const,
            summary: block.summary ?? german.summary,
            why_correct: block.whyCorrect ?? null,
            why_incorrect: block.whyIncorrect ?? null,
            common_trap: block.commonTrap ?? null,
            tested_concept: null,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "question_id,language" }
        );
        if (upsertError) throw upsertError;
      }
      translated++;
    } catch (err) {
      console.error(`Failed for question ${questionId}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`Done. Translated ${translated}, already complete ${skipped}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
