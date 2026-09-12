/**
 * Exports every question that hasn't been enriched yet (no German
 * explanation on file) as small JSON batches, for pasting into a Claude.ai
 * Project running the prompt in scripts/prompts/question-enrichment-prompt.md
 * — an offline alternative to generating explanations/vocabulary/question
 * translations live via Gemini, which has a very low free-tier daily quota.
 *
 * Usage:
 *   npm run export:enrichment -- --email=you@example.com [--batchSize=10] [--out=dir]
 *
 * Writes supabase/seed/question-enrichment/batch-001.json, batch-002.json, …
 * — each capped at --batchSize items (default 10; smaller than the
 * translation-only export since each item's expected output here is much
 * larger: explanations in 4 languages + vocabulary + a question translation).
 * Also writes existing-topics.json (the user's current topic names) once,
 * alongside the batches, so Claude can reuse them instead of creating
 * near-duplicate topics.
 *
 * Safe to re-run: only exports questions with no German explanation yet.
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

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run export:enrichment -- --email=you@example.com [--batchSize=10] [--out=dir]");
    process.exit(1);
  }
  const batchSize = Number(args.get("batchSize") ?? "10") || 10;
  const outDir = resolve(process.cwd(), args.get("out") ?? "supabase/seed/question-enrichment");

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
    .select("id, question_text, correct_answer_unknown, question_options(id, label, option_text, is_correct)")
    .eq("user_id", userId)
    .eq("correct_answer_unknown", false)
    .order("created_at", { ascending: true });
  if (qError) throw qError;

  const { data: existingExplanations, error: eError } = await supabase
    .from("question_explanations")
    .select("question_id")
    .eq("owner_id", userId)
    .eq("language", "de");
  if (eError) throw eError;
  const alreadyEnriched = new Set((existingExplanations ?? []).map((e) => e.question_id));

  const { data: topics, error: tError } = await supabase.from("topics").select("name").order("name");
  if (tError) throw tError;

  const pending = (questions ?? []).filter((q) => !alreadyEnriched.has(q.id) && (q.question_options?.length ?? 0) > 0);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "existing-topics.json"), JSON.stringify((topics ?? []).map((t) => t.name), null, 2));

  if (pending.length === 0) {
    console.log("Nothing to export — every question already has a German explanation.");
    return;
  }

  let batchCount = 0;
  for (let i = 0; i < pending.length; i += batchSize) {
    batchCount++;
    const batch = pending.slice(i, i + batchSize).map((q) => ({
      id: q.id,
      text: q.question_text,
      options: [...q.question_options]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((o) => ({ label: o.label, text: o.option_text })),
      correctLabel: q.question_options.find((o) => o.is_correct)?.label ?? null,
    }));
    const fileName = `batch-${String(batchCount).padStart(3, "0")}.json`;
    writeFileSync(resolve(outDir, fileName), JSON.stringify(batch, null, 2));
    console.log(`Wrote ${fileName} (${batch.length} questions)`);
  }

  console.log(
    `\nExported ${pending.length} question(s) across ${batchCount} file(s) in ${outDir}.\n` +
      `Also wrote existing-topics.json — paste it once at the start of your Claude Project chat (or include it ` +
      `in custom instructions) so new questions reuse existing topic names where they fit.\n` +
      `Paste each batch file into your Claude Project (see scripts/prompts/question-enrichment-prompt.md), ` +
      `save each response as supabase/seed/question-enrichment/results/<same-filename>, then run:\n` +
      `  npm run import:enrichment -- --email=${email}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
