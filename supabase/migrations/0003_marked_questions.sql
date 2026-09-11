-- =========================================================================
-- Adds a "marked" flag to questions — a distinct concept from `favorite`
-- (the star toggle): a lightweight "come back to this later" marker you can
-- set while practicing, filterable from the Questions page.
-- =========================================================================

alter table questions
  add column marked boolean not null default false;

create index questions_marked_idx on questions (user_id, marked) where marked = true;
