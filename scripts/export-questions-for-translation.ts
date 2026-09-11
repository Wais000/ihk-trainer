/**
 * Exports every question that's missing a full-question translation (in
 * en/dari/he — see migration 0005_question_translations.sql) as small JSON
 * batches, for pasting into a Claude.ai Project running the prompt in
 * scripts/prompts/question-translation-prompt.md — an offline alternative
 * to generating these live via Gemini, which has a very low free-tier daily
 * request quota.
 *
 * Usage:
 *   npm run export:question-translations -- --email=you@example.com [--batchSize=25] [--out=dir]
 *
 * Writes supabase/seed/question-translations/batch-001.json, batch-002.json, …
 * Each file is a JSON array of { id, text }, capped at --batchSize items
 * (default 25) so a single file comfortably fits in one Claude response.
 * Safe to re-run: only exports questions that don't already have all three
 * languages cached.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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

const LANGUAGES = ["en", "dari", "he"] as const;

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run export:question-translations -- --email=you@example.com [--batchSize=25] [--out=dir]");
    process.exit(1);
  }
  const batchSize = Number(args.get("batchSize") ?? "25") || 25;
  const outDir = resolve(process.cwd(), args.get("out") ?? "supabase/seed/question-translations");

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

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, question_text")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (qError) throw qError;

  const { data: existing, error: tError } = await supabase
    .from("question_translations")
    .select("question_id, language")
    .eq("owner_id", userId);
  if (tError) throw tError;

  const doneLanguagesByQuestion = new Map<string, Set<string>>();
  for (const row of existing ?? []) {
    if (!doneLanguagesByQuestion.has(row.question_id)) doneLanguagesByQuestion.set(row.question_id, new Set());
    doneLanguagesByQuestion.get(row.question_id)!.add(row.language);
  }

  const pending = (questions ?? []).filter((q) => {
    const done = doneLanguagesByQuestion.get(q.id);
    return !done || LANGUAGES.some((l) => !done.has(l));
  });

  if (pending.length === 0) {
    console.log("Nothing to export — every question already has all three translations cached.");
    return;
  }

  mkdirSync(outDir, { recursive: true });

  let batchCount = 0;
  for (let i = 0; i < pending.length; i += batchSize) {
    batchCount++;
    const batch = pending.slice(i, i + batchSize).map((q) => ({ id: q.id, text: q.question_text }));
    const fileName = `batch-${String(batchCount).padStart(3, "0")}.json`;
    writeFileSync(resolve(outDir, fileName), JSON.stringify(batch, null, 2));
    console.log(`Wrote ${fileName} (${batch.length} questions)`);
  }

  console.log(
    `\nExported ${pending.length} question(s) across ${batchCount} file(s) in ${outDir}.\n` +
      `Paste each file's contents into your Claude Project (see scripts/prompts/question-translation-prompt.md), ` +
      `save each response as supabase/seed/question-translations/results/<same-filename>, then run:\n` +
      `  npm run import:question-translations -- --email=${email}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
