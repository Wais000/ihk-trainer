-- =========================================================================
-- Caches a natural, meaning-first (not word-for-word) translation of a
-- question's full text into the learner's chosen language — generated once
-- per question+language via an LLM, then reused on every later view.
-- =========================================================================

create table question_translations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  language explanation_language not null,
  translated_text text not null,
  generated_at timestamptz not null default now(),
  unique (question_id, language)
);

alter table question_translations enable row level security;

create policy "question_translations_all_own" on question_translations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index question_translations_question_id_idx on question_translations (question_id);
