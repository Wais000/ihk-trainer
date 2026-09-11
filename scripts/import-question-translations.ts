/**
 * Imports Claude-generated question translations (see
 * scripts/prompts/question-translation-prompt.md and
 * export-questions-for-translation.ts) into question_translations —
 * an offline alternative to generating them live via Gemini.
 *
 * Usage:
 *   npm run import:question-translations -- --email=you@example.com [--dir=path]
 *
 * Reads every *.json file in --dir (default:
 * supabase/seed/question-translations/results/). Each file must be a JSON
 * array of { id, en, dari, he } — exactly what
 * scripts/prompts/question-translation-prompt.md asks Claude to return.
 * Safe to re-run: upserts on (question_id, language), never creates
 * duplicates, and skips any language field that's missing or empty on a
 * given item rather than overwriting a good cached translation with nothing.
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

interface ResultItem {
  id: string;
  en?: string;
  dari?: string;
  he?: string;
}

const LANGUAGES = ["en", "dari", "he"] as const;

async function main() {
  loadEnvLocal();
  const args = parseArgs();

  const email = args.get("email") ?? process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error("Usage: npm run import:question-translations -- --email=you@example.com [--dir=path]");
    process.exit(1);
  }
  const dir = resolve(process.cwd(), args.get("dir") ?? "supabase/seed/question-translations/results");
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

  // Validate every question id actually belongs to this user before writing
  // anything — a bad paste (wrong batch, truncated response) should fail
  // loudly, not silently attach translations to someone else's questions.
  const { data: ownQuestions, error: qError } = await supabase.from("questions").select("id").eq("user_id", userId);
  if (qError) throw qError;
  const ownIds = new Set((ownQuestions ?? []).map((q) => q.id));

  let imported = 0;
  let skippedRows = 0;
  let failedItems = 0;

  for (const file of files) {
    const items: ResultItem[] = JSON.parse(readFileSync(resolve(dir, file), "utf-8"));
    console.log(`${file}: ${items.length} item(s)`);

    for (const item of items) {
      if (!item.id || !ownIds.has(item.id)) {
        console.error(`  Skipping unknown/foreign question id: ${item.id}`);
        failedItems++;
        continue;
      }

      for (const lang of LANGUAGES) {
        const text = item[lang];
        if (!text || !text.trim()) {
          skippedRows++;
          continue;
        }
        const { error } = await supabase.from("question_translations").upsert(
          { question_id: item.id, owner_id: userId, language: lang, translated_text: text.trim() },
          { onConflict: "question_id,language" }
        );
        if (error) {
          console.error(`  Failed for ${item.id} (${lang}):`, error.message);
          failedItems++;
        } else {
          imported++;
        }
      }
    }
  }

  console.log(`\nDone. Imported ${imported} translation row(s), skipped ${skippedRows} empty field(s), ${failedItems} failure(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
