-- =========================================================================
-- Adds a UI/menu language preference, separate from explanation_language
-- (which controls question-explanation/vocabulary translation and must
-- stay untouched). Defaults to English.
-- =========================================================================

alter table user_settings
  add column ui_language explanation_language not null default 'en';
