import { google } from "@ai-sdk/google";

/**
 * Single place the AI provider/model is chosen. Swapping providers (or
 * adding a local model later) means changing this file only — nothing in
 * /lib/ai or /lib/translation should import a provider SDK directly.
 *
 * Uses Google's free-tier Gemini API (GOOGLE_GENERATIVE_AI_API_KEY) — this
 * step only needs to write ONE German explanation per question; the other
 * languages are machine-translated from that text (see batch-enrichment.ts).
 */
export function getEnrichmentModel() {
  return google("gemini-flash-latest");
}
