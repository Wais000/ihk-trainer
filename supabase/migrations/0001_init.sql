-- =========================================================================
-- IHK Exam Trainer — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Every user-owned table has Row Level Security enabled;
-- a user can never read or write another user's rows.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------------
create type explanation_language as enum ('de', 'en', 'dari', 'he');
create type app_theme as enum ('system', 'light', 'dark');
create type explanation_source as enum ('source', 'ai_generated');
create type question_status as enum ('ready', 'needs_review', 'correct_answer_unknown');
create type import_status as enum ('pending', 'processing', 'completed', 'failed');
create type import_item_status as enum ('pending', 'parsed', 'needs_review', 'duplicate', 'saved', 'failed');
create type attempt_mode as enum ('practice', 'review', 'exam');
create type mistake_category as enum ('A', 'B', 'C', 'D', 'E', 'F'); -- A=Comprehension B=Knowledge C=Logic D=Careless E=Vocabulary F=Unknown
create type flag_type as enum ('wrong_answer', 'bad_explanation', 'bad_translation', 'duplicate', 'other');
create type flag_status as enum ('open', 'resolved');
create type exam_session_status as enum ('in_progress', 'completed');

-- -------------------------------------------------------------------------
-- profiles — one row per authenticated user (mirrors auth.users)
-- -------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- -------------------------------------------------------------------------
-- user_settings — one row per user
-- -------------------------------------------------------------------------
create table user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  explanation_language explanation_language not null default 'de',
  translation_dari_enabled boolean not null default true,
  translation_hebrew_enabled boolean not null default true,
  instant_translation_enabled boolean not null default true,
  daily_target integer not null default 100,
  theme app_theme not null default 'system',
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "user_settings_all_own" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- topics — global reference data (e.g. "Sicherheitsgrundlagen, Begriffe")
-- Not user-owned. Readable by every authenticated user; writable only by
-- the service role (seeded/managed by us, not end users).
-- -------------------------------------------------------------------------
create table topics (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references topics (id) on delete set null,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table topics enable row level security;

create policy "topics_select_all" on topics for select using (auth.role() = 'authenticated');

-- -------------------------------------------------------------------------
-- imports — one row per paste/import batch
-- -------------------------------------------------------------------------
create table imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_text text not null,
  status import_status not null default 'pending',
  total_items integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table imports enable row level security;

create policy "imports_all_own" on imports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index imports_user_id_idx on imports (user_id, created_at desc);

-- -------------------------------------------------------------------------
-- import_items — one row per question inside an import batch, tracked
-- through the pipeline so a failure never loses the raw pasted text.
-- -------------------------------------------------------------------------
create table import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references imports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_text text not null,
  parsed jsonb,
  status import_item_status not null default 'pending',
  error_message text,
  question_id uuid, -- set once saved as a real question row
  created_at timestamptz not null default now()
);

alter table import_items enable row level security;

create policy "import_items_all_own" on import_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index import_items_import_id_idx on import_items (import_id);
create index import_items_user_id_idx on import_items (user_id);

-- -------------------------------------------------------------------------
-- questions — imported questions belong to the importing user (private by
-- default; there is no cross-user sharing in this version)
-- -------------------------------------------------------------------------
create table questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_item_id uuid references import_items (id) on delete set null,
  topic_id uuid references topics (id) on delete set null,
  subtopic text,
  question_text text not null,
  question_text_normalized text, -- lowercased/whitespace-collapsed, for duplicate detection
  source text, -- e.g. "IHK Musterprüfung 2024", left null if unknown
  difficulty smallint check (difficulty between 1 and 5),
  exam_keywords text[],
  status question_status not null default 'ready',
  correct_answer_unknown boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table questions enable row level security;

create policy "questions_all_own" on questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index questions_user_id_idx on questions (user_id);
create index questions_topic_id_idx on questions (topic_id);
create index questions_normalized_idx on questions (user_id, question_text_normalized);
create index questions_favorite_idx on questions (user_id, favorite) where favorite = true;

-- -------------------------------------------------------------------------
-- question_options — answer choices (A/B/C/D…)
-- owner_id is denormalized from the parent question so RLS never needs a
-- join, which keeps practice-mode reads fast.
-- -------------------------------------------------------------------------
create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  label text not null, -- "A", "B", "C", "D"
  option_text text not null,
  is_correct boolean not null default false,
  sort_order smallint not null default 0
);

alter table question_options enable row level security;

create policy "question_options_all_own" on question_options for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index question_options_question_id_idx on question_options (question_id);

-- -------------------------------------------------------------------------
-- question_explanations — one row per question per language.
-- Structured so the UI can render "why correct / why wrong / trap" without
-- re-parsing free text, per the IHK-trainer explanation style.
-- -------------------------------------------------------------------------
create table question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  language explanation_language not null,
  source explanation_source not null default 'ai_generated',
  summary text not null,          -- what the question is actually asking
  why_correct text,                -- why the correct answer is correct
  why_incorrect text,               -- why the other options are wrong
  common_trap text,                -- the typical trap / misconception
  tested_concept text,             -- the underlying IHK concept being tested
  generated_at timestamptz not null default now(),
  unique (question_id, language)
);

alter table question_explanations enable row level security;

create policy "question_explanations_all_own" on question_explanations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index question_explanations_question_id_idx on question_explanations (question_id);

-- -------------------------------------------------------------------------
-- question_vocabulary — curated "Important Words" per question (max a
-- handful per question — not every word in the question)
-- -------------------------------------------------------------------------
create table question_vocabulary (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  german_word text not null,
  english_meaning text,
  dari_meaning text,
  hebrew_meaning text,
  short_german_explanation text,
  sort_order smallint not null default 0
);

alter table question_vocabulary enable row level security;

create policy "question_vocabulary_all_own" on question_vocabulary for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index question_vocabulary_question_id_idx on question_vocabulary (question_id);

-- -------------------------------------------------------------------------
-- translations — the GLOBAL hover/tap word-translation cache. Shared
-- across all users so the same German word is only ever translated once,
-- regardless of who triggers it. Not sensitive data, so it is shared
-- rather than duplicated per user.
-- -------------------------------------------------------------------------
create table translations (
  id uuid primary key default gen_random_uuid(),
  german_word text not null,
  german_word_normalized text not null unique, -- lowercased, trimmed lookup key
  english_meaning text,
  dari_meaning text,
  hebrew_meaning text,
  short_german_explanation text,
  created_at timestamptz not null default now()
);

alter table translations enable row level security;

create policy "translations_select_all" on translations for select using (auth.role() = 'authenticated');
-- Inserts/updates happen only through server actions using the service
-- role client, so no authenticated-role write policy is defined here.

create index translations_normalized_idx on translations (german_word_normalized);

-- -------------------------------------------------------------------------
-- question_attempts — every answer a user submits, in any mode
-- -------------------------------------------------------------------------
create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  mode attempt_mode not null,
  selected_option_id uuid references question_options (id) on delete set null,
  is_correct boolean not null,
  skipped boolean not null default false,
  guessed boolean not null default false,
  time_taken_seconds integer,
  attempt_number integer not null default 1,
  mistake_category mistake_category,
  mistake_category_corrected boolean not null default false, -- user overrode auto-detected category
  created_at timestamptz not null default now()
);

alter table question_attempts enable row level security;

create policy "question_attempts_all_own" on question_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index question_attempts_user_id_idx on question_attempts (user_id, created_at desc);
create index question_attempts_question_id_idx on question_attempts (question_id);

-- -------------------------------------------------------------------------
-- review_schedule — simple spaced repetition state, one row per
-- (user, question)
-- -------------------------------------------------------------------------
create table review_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  last_attempt_at timestamptz,
  next_review_at timestamptz not null default now(),
  review_interval_days integer not null default 0,
  consecutive_correct integer not null default 0,
  consecutive_wrong integer not null default 0,
  unique (user_id, question_id)
);

alter table review_schedule enable row level security;

create policy "review_schedule_all_own" on review_schedule for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index review_schedule_due_idx on review_schedule (user_id, next_review_at);

-- -------------------------------------------------------------------------
-- study_sessions — practice/review session summaries
-- -------------------------------------------------------------------------
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode attempt_mode not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  questions_count integer not null default 0,
  correct_count integer not null default 0
);

alter table study_sessions enable row level security;

create policy "study_sessions_all_own" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index study_sessions_user_id_idx on study_sessions (user_id, started_at desc);

-- -------------------------------------------------------------------------
-- exam_sessions / exam_answers — timed mock-exam simulation
-- -------------------------------------------------------------------------
create table exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status exam_session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  skipped_count integer not null default 0
);

alter table exam_sessions enable row level security;

create policy "exam_sessions_all_own" on exam_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index exam_sessions_user_id_idx on exam_sessions (user_id, started_at desc);

create table exam_answers (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references exam_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  selected_option_id uuid references question_options (id) on delete set null,
  is_correct boolean,
  marked_for_review boolean not null default false,
  time_taken_seconds integer,
  sort_order smallint not null default 0
);

alter table exam_answers enable row level security;

create policy "exam_answers_all_own" on exam_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index exam_answers_session_id_idx on exam_answers (exam_session_id);

-- -------------------------------------------------------------------------
-- favorites
-- -------------------------------------------------------------------------
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table favorites enable row level security;

create policy "favorites_all_own" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- question_flags — user-reported problems ("Wrong answer", "Bad
-- explanation", …)
-- -------------------------------------------------------------------------
create table question_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  flag_type flag_type not null,
  note text,
  status flag_status not null default 'open',
  created_at timestamptz not null default now()
);

alter table question_flags enable row level security;

create policy "question_flags_all_own" on question_flags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- activity_log — lightweight event stream for the History screen
-- (vocabulary viewed, translations viewed, explanations viewed, etc.)
-- -------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null, -- e.g. 'question_viewed', 'translation_viewed', 'explanation_viewed'
  question_id uuid references questions (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy "activity_log_all_own" on activity_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index activity_log_user_id_idx on activity_log (user_id, created_at desc);

-- -------------------------------------------------------------------------
-- Auto-create profile + default settings when a new auth user signs up
-- -------------------------------------------------------------------------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data ->> 'display_name');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- -------------------------------------------------------------------------
-- Seed topics for the first imported batch (Cyber-Security / Grundlagen)
-- -------------------------------------------------------------------------
insert into topics (name, slug) values
  ('Cyber-Sicherheit Grundlagen', 'cyber-security-grundlagen');

insert into topics (name, slug, parent_id) values
  ('Begriffe und Bedeutung', 'begriffe-und-bedeutung',
    (select id from topics where slug = 'cyber-security-grundlagen'));
