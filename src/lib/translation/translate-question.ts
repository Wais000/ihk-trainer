import { z } from "zod";
import { generateObject } from "ai";
import { getEnrichmentModel } from "@/lib/ai/provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExplanationLanguage } from "@/lib/validation/question";
import { LANGUAGE_LABELS } from "@/lib/i18n/languages";

const questionTranslationSchema = z.object({
  translation: z.string(),
});

const SYSTEM_PROMPT = `You translate German IHK exam questions for learners. Translate the meaning naturally and
fluently, the way a native speaker of the target language would actually phrase the question — never
word-for-word. Preserve the exact question intent and any answer-option letters (A, B, C, D, ...) exactly
as literal Latin letters, unchanged. Return only the translated question text, nothing else — no notes, no
quotation marks around it.`;

async function translateQuestionNaturally(germanText: string, language: ExplanationLanguage): Promise<string> {
  const { object } = await generateObject({
    model: getEnrichmentModel(),
    schema: questionTranslationSchema,
    system: SYSTEM_PROMPT,
    prompt: `Translate this German exam question into ${LANGUAGE_LABELS[language]}:\n\n${germanText}`,
    maxRetries: 0,
  });
  return object.translation;
}

/** Returns a cached natural translation of a question's full text, or
 * generates and caches one on a miss — one LLM call per (question,
 * language) ever, not per view, since the question text never changes. */
export async function getQuestionTranslation(
  supabase: SupabaseClient,
  questionId: string,
  ownerId: string,
  language: ExplanationLanguage,
  germanText: string
): Promise<string> {
  const { data: cached } = await supabase
    .from("question_translations")
    .select("translated_text")
    .eq("question_id", questionId)
    .eq("language", language)
    .maybeSingle();
  if (cached) return cached.translated_text;

  const translated = await translateQuestionNaturally(germanText, language);

  await supabase.from("question_translations").upsert(
    { question_id: questionId, owner_id: ownerId, language, translated_text: translated },
    { onConflict: "question_id,language" }
  );

  return translated;
}
