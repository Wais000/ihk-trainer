import { z } from "zod";

/**
 * Result of translating a single German word for the instant hover/tap
 * popup. Validated before being written into the shared `translations`
 * cache table.
 */
export const wordTranslationSchema = z.object({
  germanWord: z.string().min(1),
  englishMeaning: z.string().nullable(),
  dariMeaning: z.string().nullable(),
  hebrewMeaning: z.string().nullable(),
  shortGermanExplanation: z.string().nullable(),
});
export type WordTranslation = z.infer<typeof wordTranslationSchema>;
