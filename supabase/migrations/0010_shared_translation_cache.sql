-- =========================================================================
-- Follow-up to 0009_shared_question_pool.sql — two translation-cache tables
-- were missed there. They still restricted reads to `owner_id = auth.uid()`,
-- so once questions became a shared pool, any user viewing a question they
-- didn't personally import got no cached translation back at all (question
-- text, answer options, and the correct-answer translation all silently
-- disappeared for them, even though a translation row existed).
-- =========================================================================

drop policy "question_translations_all_own" on question_translations;
create policy "question_translations_select_all" on question_translations for select using (auth.role() = 'authenticated');
create policy "question_translations_insert_own" on question_translations for insert with check (auth.uid() = owner_id);
create policy "question_translations_update_own" on question_translations for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "question_translations_delete_own" on question_translations for delete using (auth.uid() = owner_id);

drop policy "question_option_translations_all_own" on question_option_translations;
create policy "question_option_translations_select_all" on question_option_translations for select using (auth.role() = 'authenticated');
create policy "question_option_translations_insert_own" on question_option_translations for insert with check (auth.uid() = owner_id);
create policy "question_option_translations_update_own" on question_option_translations for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "question_option_translations_delete_own" on question_option_translations for delete using (auth.uid() = owner_id);
