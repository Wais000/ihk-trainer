/**
 * Imports a raw pasted question dump (the "question / A / text / … / ✓ or ✗ /
 * Correct Answer / X / Explanation / text" export format — same as the
 * app's own /questions/import paste flow) directly into the database,
 * for bulk additions too large to paste through the UI one file at a time.
 *
 * Reuses the exact same parser and duplicate-detection logic the app's own
 * import flow uses (src/lib/parsing/*), so behavior matches exactly what
 * you'd get pasting the same text into /questions/import — except this
 * also tolerates two copy-paste artifacts commonly seen in bulk exports
 * from other study-tool sites:
 *   1. A "Your answer: X" line on its own (not glued to "Correct!"/"Incorrect").
 *   2. The correct-answer letter glued directly onto the start of the next
 *      question's text with no line break (e.g. "BIn einem Prozesshaus…").
 *
 * Usage:
 *   npm run import:raw-questions -- --email=you@example.com --file=path.txt [--topic="Name"]
 *
 * The file may start with an optional "category: <Name>" line, which sets
 * the topic for every question in the file (overridden by --topic if given).
 * Likely duplicates of existing questions (same similarity check the app
 * uses) are skipped, not inserted twice — safe to re-run.
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

/** Cleans up the two known copy-paste artifacts before handing text to the
 * shared parser (never changes well-formed input, only these two patterns). */
function preprocessRawText(raw: string): { body: string; category: string | null } {
  const lines = raw.split(/\r?\n/);
  const categoryMatch = lines[0]?.match(/^category:\s*(.+?):?\s*$/i);
  const bodyLines = categoryMatch ? lines.slice(1) : lines;

  // Drop standalone "Your answer: X" noise lines (redundant with "Correct Answer",
  // and otherwise blocks the parser from ever reaching that line).
  const withoutYourAnswer = bodyLines.filter((l) => !/^Your answer\s*:\s*[A-H]\s*$/i.test(l.trim()));

  // Split a "Correct Answer" line's glued-on next-question text back apart.
  const fixed: string[] = [];
  for (const line of withoutYourAnswer) {
    const prevWasCorrectAnswerLabel = fixed.length > 0 && /^Correct Answer\s*:?\s*$/i.test(fixed[fixed.length - 1].trim());
    const gluedMatch = line.match(/^([A-D])([A-ZÄÖÜ].+)$/);
    if (prevWasCorrectAnswerLabel && gluedMatch) {
      fixed.push(gluedMatch[1]);
      fixed.push(gluedMatch[2]);
    } else {
      fixed.push(line);
    }
  }

  return { body: fixed.join("\n"), category: categoryMatch ? categoryMatch[1] : null };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  const filePath = args.get("file");
  if (!email || !filePath) {
    console.error('Usage: npm run import:raw-questions -- --email=you@example.com --file=path.txt [--topic="Name"]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const resolvedFilePath = resolve(process.cwd(), filePath);
  if (!existsSync(resolvedFilePath)) {
    console.error(`File not found: ${resolvedFilePath}`);
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

  const raw = readFileSync(resolvedFilePath, "utf-8");
  const { body, category } = preprocessRawText(raw);
  const topicName = args.get("topic") ?? category;

  const parsed = parseQuestionPaste(body);
  console.log(`Parsed ${parsed.length} question(s) from ${filePath}${topicName ? ` (topic: ${topicName})` : ""}.`);
  const unknownCorrect = parsed.filter((p) => p.correctAnswerUnknown).length;
  if (unknownCorrect > 0) {
    console.log(`  ${unknownCorrect} question(s) have no detected correct answer — these will be saved as needing manual review, not skipped.`);
  }

  let topicId: string | null = null;
  if (topicName) {
    const slug = slugify(topicName);
    const { data: existingTopic } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();
    if (existingTopic) {
      topicId = existingTopic.id;
    } else {
      const { data: createdTopic, error } = await supabase.from("topics").insert({ name: topicName, slug }).select("id").single();
      if (error) console.error(`Could not create topic "${topicName}": ${error.message}`);
      else topicId = createdTopic.id;
    }
  }

  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("id, question_text_normalized")
    .eq("user_id", userId)
    .not("question_text_normalized", "is", null);
  const existingCandidates: DuplicateCandidate[] = (existingQuestions ?? []).map((q) => ({
    id: q.id,
    questionTextNormalized: q.question_text_normalized as string,
  }));

  let saved = 0;
  let duplicates = 0;
  let failed = 0;

  for (const item of parsed) {
    const normalized = normalizeQuestionText(item.questionText);
    const duplicate = findLikelyDuplicate(normalized, existingCandidates);
    if (duplicate) {
      duplicates++;
      console.log(`  Skipping likely duplicate: "${item.questionText.slice(0, 70)}..."`);
      continue;
    }

    try {
      const correctLabel = item.options.find((o) => o.isCorrect)?.label ?? null;

      const { data: question, error: qError } = await supabase
        .from("questions")
        .insert({
          user_id: userId,
          topic_id: topicId,
          question_text: item.questionText,
          question_text_normalized: normalized,
          status: "ready",
          correct_answer_unknown: item.correctAnswerUnknown,
        })
        .select("id")
        .single();
      if (qError || !question) throw new Error(qError?.message ?? "insert failed");

      const { error: oError } = await supabase.from("question_options").insert(
        item.options.map((o, idx) => ({
          question_id: question.id,
          owner_id: userId,
          label: o.label,
          option_text: o.text,
          is_correct: o.label === correctLabel,
          sort_order: idx,
        }))
      );
      if (oError) throw new Error(oError.message);

      if (item.sourceExplanation) {
        await supabase.from("question_explanations").insert({
          question_id: question.id,
          owner_id: userId,
          language: "de",
          source: "source",
          summary: item.sourceExplanation,
        });
      }

      existingCandidates.push({ id: question.id, questionTextNormalized: normalized });
      saved++;
    } catch (err) {
      failed++;
      console.error(`  Failed to save "${item.questionText.slice(0, 70)}...":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. Saved ${saved}, skipped ${duplicates} likely duplicate(s), ${failed} failure(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
