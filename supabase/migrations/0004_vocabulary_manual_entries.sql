-- =========================================================================
-- Lets a vocabulary word be added manually from the Vocabulary page,
-- independent of any question (question_vocabulary rows were previously
-- always generated as part of a specific question's AI enrichment).
-- =========================================================================

alter table question_vocabulary
  alter column question_id drop not null;
