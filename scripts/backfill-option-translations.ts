/**
 * One-time fix for question_translations rows that were imported with the
 * question stem AND every answer option's translation bundled into one
 * paragraph (e.g. "...stem text?\nA) ...\nB) ...\nC) ...\nD) ..."), a format
 * mistake in an earlier version of the offline enrichment prompt.
 *
 * For each affected row, splits it into:
 *   - the stem-only translation, written back to question_translations
 *   - one row per option in the new question_option_translations table,
 *     matched to the real question_options row by label
 *
 * Safe to re-run: rows without the embedded-options pattern are left
 * untouched, and every write is an update/upsert.
 *
 * Usage:
 *   npm run backfill:option-translations -- --email=you@example.com
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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

const OPTION_LINE_RE = /^([A-H])\)\s*(.*)$/;

function splitStemAndOptions(text: string): { stem: string; options: Map<string, string> } | null {
  const lines = text.split(/\r?\n/);
  const firstOptionIndex = lines.findIndex((l) => OPTION_LINE_RE.test(l.trim()));
  if (firstOptionIndex <= 0) return null; // no embedded options found (or options with no stem, which is invalid)

  const stem = lines.slice(0, firstOptionIndex).join("\n").trim();
  const options = new Map<string, string>();
  let lastLabel: string | null = null;
  for (const rawLine of lines.slice(firstOptionIndex)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(OPTION_LINE_RE);
    if (match) {
      lastLabel = match[1];
      options.set(lastLabel, match[2].trim());
    } else if (lastLabel) {
      // A wrapped continuation line of the previous option's text.
      options.set(lastLabel, `${options.get(lastLabel)} ${line}`.trim());
    }
  }
  return { stem, options };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run backfill:option-translations -- --email=you@example.com");
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

  const { data: options, error: oError } = await supabase
    .from("question_options")
    .select("id, question_id, label")
    .eq("owner_id", userId);
  if (oError) throw oError;
  const optionIdByQuestionAndLabel = new Map<string, string>();
  for (const o of options ?? []) {
    optionIdByQuestionAndLabel.set(`${o.question_id}:${o.label}`, o.id);
  }

  const { data: translations, error: tError } = await supabase
    .from("question_translations")
    .select("id, question_id, language, translated_text")
    .eq("owner_id", userId);
  if (tError) throw tError;

  let fixed = 0;
  let skippedNoPattern = 0;
  let skippedMismatch = 0;

  for (const row of translations ?? []) {
    const split = splitStemAndOptions(row.translated_text);
    if (!split) {
      skippedNoPattern++;
      continue;
    }

    const unmatchedLabels = [...split.options.keys()].filter(
      (label) => !optionIdByQuestionAndLabel.has(`${row.question_id}:${label}`)
    );
    if (unmatchedLabels.length > 0) {
      console.error(
        `  Skipping question ${row.question_id} (${row.language}): options ${unmatchedLabels.join(", ")} don't match any real option`
      );
      skippedMismatch++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("question_translations")
      .update({ translated_text: split.stem })
      .eq("id", row.id);
    if (updateError) throw updateError;

    for (const [label, text] of split.options) {
      if (!text) continue;
      const optionId = optionIdByQuestionAndLabel.get(`${row.question_id}:${label}`)!;
      const { error: optError } = await supabase.from("question_option_translations").upsert(
        { question_option_id: optionId, owner_id: userId, language: row.language, translated_text: text },
        { onConflict: "question_option_id,language" }
      );
      if (optError) throw optError;
    }

    fixed++;
  }

  console.log(
    `\nDone. Fixed ${fixed} row(s), ${skippedNoPattern} already clean, ${skippedMismatch} skipped due to a label mismatch.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
