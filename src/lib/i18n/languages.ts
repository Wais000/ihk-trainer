import type { ExplanationLanguage } from "@/lib/validation/question";

export const LANGUAGE_LABELS: Record<ExplanationLanguage, string> = {
  de: "Deutsch",
  en: "English",
  dari: "فارسی",
  he: "עברית",
};

export const RTL_LANGUAGES: ExplanationLanguage[] = ["dari", "he"];

export function dirFor(language: ExplanationLanguage): "rtl" | "ltr" {
  return RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
}
