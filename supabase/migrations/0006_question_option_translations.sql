-- =========================================================================
-- Caches a natural translation of a single answer option's text into the
-- learner's chosen language — mirrors question_translations, but scoped to
-- one option instead of the question stem, so each option's translation is
-- shown right next to that option's own German text instead of being
-- bundled into one paragraph with the question translation.
-- =========================================================================

create table question_option_translations (
  id uuid primary key default gen_random_uuid(),
  question_option_id uuid not null references question_options (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  language explanation_language not null,
  translated_text text not null,
  generated_at timestamptz not null default now(),
  unique (question_option_id, language)
);

alter table question_option_translations enable row level security;

create policy "question_option_translations_all_own" on question_option_translations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index question_option_translations_option_id_idx on question_option_translations (question_option_id);
