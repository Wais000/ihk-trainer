"use server";

import { getWordTranslation } from "@/lib/translation/translate-word";
import { getQuestionTranslation } from "@/lib/translation/translate-question";
import { createClient } from "@/lib/supabase/server";
import type { ExplanationLanguage } from "@/lib/validation/question";

function resolvePreferredLanguage(rawLang: string | null | undefined): ExplanationLanguage {
  // "de" (the column default) isn't a valid translation target — German is
  // the question's own language — so it falls back to English, same as the
  // Settings radio does.
  return rawLang === "en" || rawLang === "dari" || rawLang === "he" ? rawLang : "en";
}

export async function getWordTranslationAction(word: string, sentence?: string) {
  // Any authenticated user can trigger a translation lookup — RLS on
  // `translations` still only allows SELECT for authenticated users; the
  // write happens via the service-role client inside getWordTranslation.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("explanation_language")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferredLang = resolvePreferredLanguage(settings?.explanation_language);

  try {
    const translation = await getWordTranslation(word, sentence);
    // The `translations` cache always holds every language (it's shared
    // across all users); only the one language matching this user's
    // preference is returned for display.
    return {
      ...translation,
      englishMeaning: preferredLang === "en" ? translation.englishMeaning : null,
      dariMeaning: preferredLang === "dari" ? translation.dariMeaning : null,
      hebrewMeaning: preferredLang === "he" ? translation.hebrewMeaning : null,
    };
  } catch {
    return null;
  }
}

/** Returns a natural, whole-sentence translation of a question's text —
 * cached per (question, user's chosen language) after the first call, so
 * only ever generated once per question+language, not per view. */
export async function getQuestionTranslationAction(
  questionId: string,
  germanText: string
): Promise<{ translation: string; dir: "ltr" | "rtl" } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("explanation_language")
    .eq("user_id", user.id)
    .maybeSingle();
  const language = resolvePreferredLanguage(settings?.explanation_language);

  try {
    const translation = await getQuestionTranslation(supabase, questionId, user.id, language, germanText);
    return { translation, dir: language === "dari" || language === "he" ? "rtl" : "ltr" };
  } catch (err) {
    console.error("getQuestionTranslationAction failed:", err);
    return null;
  }
}

export async function logVocabularyViewedAction(questionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("activity_log")
    .insert({ user_id: user.id, event_type: "translation_viewed", question_id: questionId });
}
