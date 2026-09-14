import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

const conceptualWordTranslationSchema = z.object({
  english: z.string(),
  dari: z.string(),
  hebrew: z.string(),
  germanExplanation: z.string(),
});
export type ConceptualWordTranslation = z.infer<typeof conceptualWordTranslationSchema>;

const SYSTEM_PROMPT = `You are a precise German dictionary assistant for adult learners preparing for a German IHK
vocational exam (commerce / IT / cyber-security terminology). You are given a single German word or short
phrase, with no surrounding sentence.

German words are frequently ambiguous in isolation — the same surface form can be part of a separable verb,
a fixed collocation, or a technical term with a completely different everyday meaning (e.g. "Schloss" can be
a "lock" or a "castle"; "Verfahren" can be a general "procedure" or a legal "proceeding"). Do NOT return the
first/most literal dictionary entry. Instead, return the meaning a learner would most usefully encounter for
this word in everyday German and in IHK exam material — the concept behind the word, not a mechanical
word-for-word gloss.

Give ONLY the single most useful meaning (a few words, not alternatives separated by slashes, not a full
sentence, not a grammar explanation).`;

/**
 * Translates a single German word/short phrase via Gemini, prompted to
 * return the word's real, commonly-intended CONCEPT rather than a literal
 * machine-translation gloss — used for the instant hover/tap word popup.
 * Word-only (no sentence context): still ambiguous for truly
 * context-dependent words, but far better than raw NMT for the common case
 * of a word having one dominant everyday/technical sense.
 *
 * Gemini's free tier is quota-limited (~20 requests/day at time of writing),
 * so callers should catch and fall back (see translate-word.ts) rather than
 * treat a failure here as fatal.
 */
export async function translateWordConceptually(word: string): Promise<ConceptualWordTranslation> {
  const { object } = await generateObject({
    model: google("gemini-flash-latest"),
    schema: conceptualWordTranslationSchema,
    system: SYSTEM_PROMPT,
    prompt: `German word: "${word}"\n\nGive its most useful English, Dari, and Hebrew meaning, plus a short German-language explanation of the concept (one short sentence, in simple German).`,
    // Google's Gemini endpoint returns a transient "high demand" error fairly
    // often — worth a couple of retries despite the free-tier quota, since
    // without any, most lookups fail outright rather than actually running
    // out of daily quota.
    maxRetries: 2,
  });
  return object;
}
