# Setup

## 1. Install dependencies
```
npm install
```

## 2. Create a free Supabase project
1. https://supabase.com → New project.
2. Settings → API: copy **Project URL** and **anon public** key.
3. Settings → API: copy the **service_role** key (server-only, keep secret).

## 3. Configure environment variables
```
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`), `GOOGLE_GENERATIVE_AI_API_KEY` for AI
enrichment (writes the German explanation + vocabulary — free tier, no credit card, from
aistudio.google.com/apikey), and `AZURE_TRANSLATOR_KEY` / `AZURE_TRANSLATOR_REGION` for
translating that German explanation into English/Dari/Hebrew and for word-level hover
translation (Azure AI Translator has a free F0 tier — 2M characters/month, no credit card
needed — create a "Translator" resource at portal.azure.com).

## 4. Run the database migration
Supabase → SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
Creates every table, enum, index, RLS policy, the profile-creation trigger, and seeds the
"Cyber-Sicherheit Grundlagen" topic.

## 5. Configure auth URLs
Supabase → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (update to your real domain later)
- Redirect URLs: add `http://localhost:3000/auth/callback`

## 6. Run the app
```
npm run dev
```

## 7. Import your first questions
1. Register an account, log in.
2. Go to **Fragen importieren** (or `/questions/import`).
3. Paste the contents of `supabase/seed/cyber-security-grundlagen-raw.txt` — this is your
   original 61 Cyber-Sicherheit questions, cleaned up and verified to parse correctly
   (confirmed via `src/lib/__tests__/question-parser.test.ts`: 61/61 parsed, 0 unresolved
   correct answers).
4. On the review screen, click **"Alle bereiten Fragen speichern"** to save them all.
5. Click **"Erklärungen und Vokabeln generieren"** — this calls your Anthropic API key to
   generate the missing explanations (45 of the 61 have no source explanation) in all four
   languages (DE/EN/Dari/Hebrew), plus vocabulary, for every saved question. Runs in batches
   of 10; any failures can be retried without losing already-saved questions.

## Verification (already run on this codebase)
```
npx tsc --noEmit   # clean
npm run lint       # clean
npm run test       # 16/16 passing
npm run build      # 19 routes build successfully
```

## What's built
- Auth: register/login/logout/password reset/email verification (Supabase Auth + RLS)
- Full DB schema with Row Level Security (`supabase/migrations/0001_init.sql`)
- Question import: paste → parse → per-item review (pick correct answer, duplicate
  detection, never silently invents an answer) → save → batch AI enrichment
- Practice Mode & Review Mode (prioritized: repeated mistakes → due → guessed)
- Spaced repetition (`src/lib/srs/schedule.ts` — simple 1/3/7/14-day progression,
  replaceable)
- Exam Mode: timed, German-only, hides all hints/translations, mark-for-review, results
  with weak-topic breakdown, "readiness" framing (never "you will pass")
- Explanation-language tabs (DE/EN/Dari/Hebrew — one shown at a time, remembered in settings)
- Word-level hover/tap translation with a shared cache (translated once, reused for every
  user and every future occurrence of that word)
- Questions library (search/filter: all/wrong/correct/due/unanswered/favorites), Vocabulary
  page, History page, Settings page
- Dashboard: daily goal progress, accuracy, due count, weak topics, exam-readiness estimate
- Keyboard shortcuts (1–4, Enter, N, T, E/D/H) in Practice/Review/Exam, always optional
- Accessibility: semantic HTML, visible focus states, large touch targets, reduced-motion
  support, RTL rendering for Dari/Hebrew text
- Automated tests: parser (incl. a regression test for a real bug found while processing
  your actual data), duplicate detection, spaced-repetition scheduling

## Known simplifications (documented trade-offs, not oversights)
- `study_sessions` table exists in the schema but isn't wired to a session-lifecycle UI yet
  — dashboard stats currently read directly from `question_attempts`/`activity_log`, which
  already work.
- Duplicate detection and the Questions-library filters compute in JavaScript over the
  user's own question set rather than via SQL — fine at the scale of a personal question
  bank (hundreds of questions), and simpler to reason about; revisit if a user's bank grows
  into the many thousands.
- AI enrichment and word translation require your own `ANTHROPIC_API_KEY` to actually run —
  the service layer, batching, caching, and Zod validation are all real and wired up, but
  nothing was executed against a live model in this sandbox (no key was available here).
