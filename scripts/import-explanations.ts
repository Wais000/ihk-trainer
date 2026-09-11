/**
 * Imports hand/AI-authored German explanations from
 * supabase/seed/generated-explanations-de.json into question_explanations,
 * matching each entry to an existing question by exact question_text —
 * an alternative to AI enrichment (useful when that's unavailable/unreliable).
 *
 * Usage:
 *   npm run import:explanations -- --email=you@example.com [--file=path.json]
 *
 * Each JSON entry is { "q": "<exact question text>", "explanation": "<German text>" }.
 * The whole explanation is stored as whyCorrect (the source data isn't split
 * into why-correct/why-incorrect/common-trap) with source: "source", so it
 * displays as the single "✓" block same as your other source explanations.
 * Safe to re-run: upserts on (question_id, language), never creates duplicates.
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
    console.error("Usage: npm run import:explanations -- --email=you@example.com [--file=path.json]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), args.get("file") ?? "supabase/seed/generated-explanations-de.json");
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const entries: { q: string; explanation: string }[] = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log(`Loaded ${entries.length} explanation(s) from ${filePath}`);

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

  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, question_text")
    .eq("user_id", userId);
  if (error) throw error;

  const byText = new Map((questions ?? []).map((q) => [q.question_text.trim(), q.id]));

  let matched = 0;
  let unmatched = 0;
  for (const entry of entries) {
    const questionId = byText.get(entry.q.trim());
    if (!questionId) {
      console.warn(`No matching question for: "${entry.q.slice(0, 70)}..."`);
      unmatched++;
      continue;
    }

    const { error: upsertError } = await supabase.from("question_explanations").upsert(
      {
        question_id: questionId,
        owner_id: userId,
        language: "de",
        source: "source",
        summary: entry.explanation,
        why_correct: entry.explanation,
        why_incorrect: null,
        common_trap: null,
        tested_concept: null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "question_id,language" }
    );
    if (upsertError) {
      console.error(`Failed to save explanation for "${entry.q.slice(0, 50)}...":`, upsertError.message);
      continue;
    }
    matched++;
  }

  console.log(`Done. Saved ${matched}, unmatched ${unmatched}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
