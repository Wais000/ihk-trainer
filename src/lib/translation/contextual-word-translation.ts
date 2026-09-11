import { z } from "zod";
import { generateObject } from "ai";
import { getEnrichmentModel } from "@/lib/ai/provider";

const contextualTranslationSchema = z.object({
  english: z.string(),
  dari: z.string(),
  hebrew: z.string(),
});

const SYSTEM_PROMPT = `You are a precise German dictionary assistant for learners preparing for a German IHK vocational exam.
You are given a full German sentence and ONE word or short run of letters highlighted from it.

German frequently uses separable verbs, fixed collocations, and idioms where translating a single word in
isolation is misleading — for example in "Es muss eine Entscheidung getroffen werden", the word "getroffen"
literally can mean "hit/struck", but here it is part of the fixed phrase "eine Entscheidung treffen" ("to
make a decision"), so in THIS sentence it means "made" (as in "a decision must be made"), not "hit".

Read the whole sentence first, understand what the highlighted word is doing grammatically and idiomatically
within it, then give ONLY the natural translation of that highlighted word AS IT FUNCTIONS in this specific
sentence — a few words, not a full sentence, not a grammar explanation, not the dictionary's generic/most
common meaning if that meaning does not fit this sentence.`;

/**
 * Translates one German word/token's meaning as it actually functions
 * within a specific sentence (not in isolation) — via an LLM rather than
 * word-level machine translation, so separable verbs, fixed collocations,
 * and idioms translate to their real contextual meaning instead of a
 * misleading literal one. Deliberately not cached by word alone: the same
 * word can mean something different in a different sentence.
 */
export async function translateWordInContext(
  word: string,
  sentence: string
): Promise<{ english: string; dari: string; hebrew: string }> {
  const { object } = await generateObject({
    model: getEnrichmentModel(),
    schema: contextualTranslationSchema,
    system: SYSTEM_PROMPT,
    prompt: `Sentence: "${sentence}"\nHighlighted word: "${word}"\n\nTranslate the highlighted word's meaning in this exact context into English, Dari, and Hebrew.`,
    maxRetries: 0,
  });
  return object;
}
