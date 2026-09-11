/**
 * Seeds questions from a raw paste-format text file straight into Supabase,
 * using the same parser and field mapping as the /questions/import UI
 * (saveImportItemAction), but via the service-role client so it can run
 * outside a browser session — for fresh setups or CI, instead of pasting
 * into the UI by hand.
 *
 * Usage:
 *   npm run seed:questions -- --email=you@example.com
 *   npm run seed:questions -- --email=you@example.com --file=supabase/seed/other.txt
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Re-running is safe: questions already saved for that user are skipped via
 * the same duplicate-detection used by the import UI.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { parseQuestionPaste } from "../src/lib/parsing/question-parser";
import { normalizeQuestionText, findLikelyDuplicate, type DuplicateCandidate } from "../src/lib/parsing/duplicate-detection";

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

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run seed:questions -- --email=you@example.com [--file=path/to/raw.txt]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), args.get("file") ?? "supabase/seed/cyber-security-grundlagen-raw.txt");
  if (!existsSync(filePath)) {
    console.error(`Seed file not found: ${filePath}`);
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

  const rawText = readFileSync(filePath, "utf-8");
  const parsed = parseQuestionPaste(rawText);
  console.log(`Parsed ${parsed.length} question(s) from ${filePath}`);

  const { data: existingRows, error: existingError } = await supabase
    .from("questions")
    .select("id, question_text_normalized")
    .eq("user_id", userId);
  if (existingError) throw existingError;

  const existing: DuplicateCandidate[] = (existingRows ?? [])
    .filter((r) => r.question_text_normalized)
    .map((r) => ({ id: r.id, questionTextNormalized: r.question_text_normalized as string }));

  let saved = 0;
  let skippedDuplicate = 0;
  let skippedUnknownAnswer = 0;
  let failed = 0;

  for (const item of parsed) {
    const correctLabel = item.options.find((o) => o.isCorrect)?.label;
    if (item.correctAnswerUnknown || !correctLabel) {
      console.warn(`Skipping (no correct answer resolved): "${item.questionText.slice(0, 60)}..."`);
      skippedUnknownAnswer++;
      continue;
    }

    const normalized = normalizeQuestionText(item.questionText);
    const duplicate = findLikelyDuplicate(normalized, existing);
    if (duplicate) {
      skippedDuplicate++;
      continue;
    }

    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        user_id: userId,
        question_text: item.questionText,
        question_text_normalized: normalized,
        source: item.source,
        status: "ready",
        correct_answer_unknown: false,
      })
      .select("id")
      .single();

    if (questionError || !question) {
      console.error(`Failed to save question "${item.questionText.slice(0, 60)}...":`, questionError?.message);
      failed++;
      continue;
    }

    const { error: optionsError } = await supabase.from("question_options").insert(
      item.options.map((option, index) => ({
        question_id: question.id,
        owner_id: userId,
        label: option.label,
        option_text: option.text,
        is_correct: option.label === correctLabel,
        sort_order: index,
      }))
    );
    if (optionsError) {
      console.error(`Failed to save options for question ${question.id}:`, optionsError.message);
      failed++;
      continue;
    }

    if (item.sourceExplanation) {
      const { error: explanationError } = await supabase.from("question_explanations").insert({
        question_id: question.id,
        owner_id: userId,
        language: "de",
        source: "source",
        summary: item.sourceExplanation,
      });
      if (explanationError) {
        console.error(`Failed to save explanation for question ${question.id}:`, explanationError.message);
      }
    }

    existing.push({ id: question.id, questionTextNormalized: normalized });
    saved++;
  }

  console.log(
    `Done. Saved ${saved}, skipped ${skippedDuplicate} duplicate(s), skipped ${skippedUnknownAnswer} with no resolved answer, ${failed} failed.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
