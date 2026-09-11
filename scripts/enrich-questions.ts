/**
 * Runs AI enrichment (German explanation + vocabulary, then machine
 * translation into EN/Dari/Hebrew) for every eligible question belonging to
 * one user, using the service-role client. The in-app "Erklärungen
 * generieren" button only works for questions imported through the
 * /questions/import UI flow (it enriches one import batch at a time); this
 * script covers questions added any other way (e.g. via seed-questions.ts).
 *
 * Usage:
 *   npm run enrich:questions -- --email=you@example.com [--limit=5]
 *
 * Requires GOOGLE_GENERATIVE_AI_API_KEY, AZURE_TRANSLATOR_KEY, and
 * AZURE_TRANSLATOR_REGION in .env.local. Safe to re-run: each question is
 * enriched independently, and failures don't affect already-enriched ones.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { enrichQuestionsBatch } from "../src/lib/ai/batch-enrichment";

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
    console.error("Usage: npm run enrich:questions -- --email=you@example.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local");
    process.exit(1);
  }
  if (!process.env.AZURE_TRANSLATOR_KEY || !process.env.AZURE_TRANSLATOR_REGION) {
    console.error("Missing AZURE_TRANSLATOR_KEY or AZURE_TRANSLATOR_REGION in .env.local");
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

  const { data: questions, error } = await supabase
    .from("questions")
    .select("id")
    .eq("user_id", userId)
    .eq("correct_answer_unknown", false);
  if (error) throw error;

  const limitArg = args.get("limit");
  const limit = limitArg ? Number(limitArg) : undefined;
  const questionIds = (questions ?? []).map((q) => q.id).slice(0, limit);
  console.log(`Enriching ${questionIds.length} question(s) for ${email}...`);

  const summary = await enrichQuestionsBatch(supabase, questionIds, userId);
  console.log(`Done. Succeeded: ${summary.succeeded.length}, failed: ${summary.failed.length}`);
  if (summary.failed.length > 0) {
    console.log("Failures:");
    for (const f of summary.failed) console.log(`  ${f.questionId}: ${f.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
