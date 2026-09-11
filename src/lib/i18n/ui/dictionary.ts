import { en } from "./en";
import { de } from "./de";
import { dari } from "./dari";
import { he } from "./he";
import type { UiDictionary } from "./en";
import type { ExplanationLanguage } from "@/lib/validation/question";

const DICTIONARIES: Record<ExplanationLanguage, UiDictionary> = { en, de, dari, he };

export function getUiDictionary(lang: ExplanationLanguage): UiDictionary {
  return DICTIONARIES[lang] ?? DICTIONARIES.en;
}

export type { UiDictionary };
