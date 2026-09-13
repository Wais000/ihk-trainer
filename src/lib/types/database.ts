// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Once a real Supabase project exists, these can be regenerated with:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
// Keep this file in sync with the migration until then.

export type ExplanationLanguageDb = "de" | "en" | "dari" | "he";
export type AppTheme = "system" | "light" | "dark";
export type ExplanationSource = "source" | "ai_generated";
export type QuestionStatus = "ready" | "needs_review" | "correct_answer_unknown";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";
export type ImportItemStatus = "pending" | "parsed" | "needs_review" | "duplicate" | "saved" | "failed";
export type AttemptMode = "practice" | "review" | "exam";
export type MistakeCategoryDb = "A" | "B" | "C" | "D" | "E" | "F";
export type FlagType = "wrong_answer" | "bad_explanation" | "bad_translation" | "duplicate" | "other";
export type FlagStatus = "open" | "resolved";
export type ExamSessionStatus = "in_progress" | "completed";

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  explanation_language: ExplanationLanguageDb;
  translation_dari_enabled: boolean;
  translation_hebrew_enabled: boolean;
  instant_translation_enabled: boolean;
  translate_question_enabled: boolean;
  translate_answers_enabled: boolean;
  translate_correct_answer_enabled: boolean;
  translate_explanation_enabled: boolean;
  daily_target: number;
  theme: AppTheme;
  updated_at: string;
}

export interface Topic {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  user_id: string;
  import_item_id: string | null;
  topic_id: string | null;
  subtopic: string | null;
  question_text: string;
  question_text_normalized: string | null;
  source: string | null;
  difficulty: number | null;
  exam_keywords: string[] | null;
  status: QuestionStatus;
  correct_answer_unknown: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionOptionRow {
  id: string;
  question_id: string;
  owner_id: string;
  label: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuestionExplanationRow {
  id: string;
  question_id: string;
  owner_id: string;
  language: ExplanationLanguageDb;
  source: ExplanationSource;
  summary: string;
  why_correct: string | null;
  why_incorrect: string | null;
  common_trap: string | null;
  tested_concept: string | null;
  generated_at: string;
}

export interface QuestionVocabularyRow {
  id: string;
  question_id: string;
  owner_id: string;
  german_word: string;
  english_meaning: string | null;
  dari_meaning: string | null;
  hebrew_meaning: string | null;
  short_german_explanation: string | null;
  sort_order: number;
}

export interface TranslationRow {
  id: string;
  german_word: string;
  german_word_normalized: string;
  english_meaning: string | null;
  dari_meaning: string | null;
  hebrew_meaning: string | null;
  short_german_explanation: string | null;
  created_at: string;
}

export interface QuestionAttemptRow {
  id: string;
  user_id: string;
  question_id: string;
  mode: AttemptMode;
  selected_option_id: string | null;
  is_correct: boolean;
  skipped: boolean;
  guessed: boolean;
  time_taken_seconds: number | null;
  attempt_number: number;
  mistake_category: MistakeCategoryDb | null;
  mistake_category_corrected: boolean;
  created_at: string;
}

export interface ReviewScheduleRow {
  id: string;
  user_id: string;
  question_id: string;
  last_attempt_at: string | null;
  next_review_at: string;
  review_interval_days: number;
  consecutive_correct: number;
  consecutive_wrong: number;
}

export interface ImportRow {
  id: string;
  user_id: string;
  raw_text: string;
  status: ImportStatus;
  total_items: number;
  created_at: string;
  completed_at: string | null;
}

export interface ImportItemRow {
  id: string;
  import_id: string;
  user_id: string;
  raw_text: string;
  parsed: unknown | null;
  status: ImportItemStatus;
  error_message: string | null;
  question_id: string | null;
  created_at: string;
}
