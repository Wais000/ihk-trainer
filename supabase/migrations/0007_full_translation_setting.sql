-- =========================================================================
-- Lets a user turn off the full-sentence translation panels (the question's
-- own translation box, and each answer option's own translation line)
-- separately from word-hover translation (instant_translation_enabled),
-- which stays controlled on its own.
-- =========================================================================

alter table user_settings add column full_translation_enabled boolean not null default true;
