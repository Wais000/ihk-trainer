-- =========================================================================
-- Shared question pool — questions imported by any user become part of one
-- global pool that practice, review, and exam simulation all draw from,
-- instead of each user only ever seeing what they personally imported.
--
-- Per-user state that used to live directly on the (previously private)
-- `questions` row — `favorite` and `marked` — cannot stay there once rows
-- are shared, since a value on the shared row would apply to every viewer.
-- `favorites` already existed as a proper per-user join table (it was just
-- unused for reads); this migration adds the equivalent for `marked` and
-- backfills both from the columns being dropped.
-- =========================================================================

-- -------------------------------------------------------------------------
-- question_marks — per-user "come back to this later" bookmark, replacing
-- the `questions.marked` column.
-- -------------------------------------------------------------------------
create table question_marks (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table question_marks enable row level security;

create policy "question_marks_all_own" on question_marks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index question_marks_user_idx on question_marks (user_id);

-- Backfill: every existing question was private to its importing user, so
-- a marked/favorited row's owner is unambiguously that same user.
insert into question_marks (user_id, question_id)
select user_id, id from questions where marked = true
on conflict do nothing;

insert into favorites (user_id, question_id)
select user_id, id from questions where favorite = true
on conflict do nothing;

drop index if exists questions_marked_idx;
drop index if exists questions_favorite_idx;

alter table questions drop column marked;
alter table questions drop column favorite;

-- -------------------------------------------------------------------------
-- questions / question_options / question_explanations / question_vocabulary
-- become readable by every authenticated user (the shared pool); writes
-- stay restricted to whoever imported/owns the row.
-- -------------------------------------------------------------------------
drop policy "questions_all_own" on questions;
create policy "questions_select_all" on questions for select using (auth.role() = 'authenticated');
create policy "questions_insert_own" on questions for insert with check (auth.uid() = user_id);
create policy "questions_update_own" on questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "questions_delete_own" on questions for delete using (auth.uid() = user_id);

drop policy "question_options_all_own" on question_options;
create policy "question_options_select_all" on question_options for select using (auth.role() = 'authenticated');
create policy "question_options_insert_own" on question_options for insert with check (auth.uid() = owner_id);
create policy "question_options_update_own" on question_options for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "question_options_delete_own" on question_options for delete using (auth.uid() = owner_id);

drop policy "question_explanations_all_own" on question_explanations;
create policy "question_explanations_select_all" on question_explanations for select using (auth.role() = 'authenticated');
create policy "question_explanations_insert_own" on question_explanations for insert with check (auth.uid() = owner_id);
create policy "question_explanations_update_own" on question_explanations for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "question_explanations_delete_own" on question_explanations for delete using (auth.uid() = owner_id);

drop policy "question_vocabulary_all_own" on question_vocabulary;
create policy "question_vocabulary_select_all" on question_vocabulary for select using (auth.role() = 'authenticated');
create policy "question_vocabulary_insert_own" on question_vocabulary for insert with check (auth.uid() = owner_id);
create policy "question_vocabulary_update_own" on question_vocabulary for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "question_vocabulary_delete_own" on question_vocabulary for delete using (auth.uid() = owner_id);
