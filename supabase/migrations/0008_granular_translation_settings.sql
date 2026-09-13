-- =========================================================================
-- Replaces the single full_translation_enabled toggle with four independent
-- ones, so a learner can turn on/off exactly the translation surfaces they
-- want: the question's own translation, all answer options' translations,
-- just the correct option's translation (useful after revealing an answer
-- without spoiling all four upfront), and the explanation's secondary-
-- language text. Word-hover translation (instant_translation_enabled)
-- stays a separate setting, untouched by this migration.
-- =========================================================================

alter table user_settings drop column full_translation_enabled;

alter table user_settings
  add column translate_question_enabled boolean not null default true,
  add column translate_answers_enabled boolean not null default true,
  add column translate_correct_answer_enabled boolean not null default true,
  add column translate_explanation_enabled boolean not null default true;
