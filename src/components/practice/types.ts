import type { ExplanationLanguage } from "@/lib/validation/question";

export interface SessionOption {
  id: string;
  label: string;
  option_text: string;
  is_correct: boolean;
}

export interface SessionVocabularyItem {
  id: string;
  german_word: string;
  english_meaning: string | null;
  dari_meaning: string | null;
  hebrew_meaning: string | null;
  short_german_explanation: string | null;
}

export interface SessionExplanation {
  language: ExplanationLanguage;
  summary: string;
  why_correct: string | null;
  why_incorrect: string | null;
  common_trap: string | null;
  tested_concept: string | null;
}

export interface SessionQuestion {
  id: string;
  question_text: string;
  marked: boolean;
  question_options: SessionOption[];
  question_vocabulary: SessionVocabularyItem[];
  question_explanations: SessionExplanation[];
}
