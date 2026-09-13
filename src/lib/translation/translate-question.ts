import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExplanationLanguage } from "@/lib/validation/question";

/** Returns a cached natural translation of a question's full text, or
 * `null` if none has been generated yet — never calls an LLM live. Full-
 * sentence translations (question, answer options, explanation) are only
 * ever produced by the offline Claude batch pipeline (see
 * scripts/prompts/*.md); live AI calls are reserved for instant word-hover
 * translation (Azure) only, since Gemini's free-tier quota (20/day) can't
 * cover hundreds of on-demand full-sentence translations. */
export async function getQuestionTranslation(
  supabase: SupabaseClient,
  questionId: string,
  language: ExplanationLanguage
): Promise<string | null> {
  const { data: cached } = await supabase
    .from("question_translations")
    .select("translated_text")
    .eq("question_id", questionId)
    .eq("language", language)
    .maybeSingle();
  return cached?.translated_text ?? null;
}
