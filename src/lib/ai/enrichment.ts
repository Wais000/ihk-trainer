import { generateObject } from "ai";
import { getEnrichmentModel } from "@/lib/ai/provider";
import {
  questionEnrichmentSchema,
  type QuestionEnrichment,
} from "@/lib/validation/question";
import type { ParsedOption } from "@/lib/validation/question";

export interface EnrichmentInput {
  questionText: string;
  options: ParsedOption[];
  correctOptionLabel: string | null; // null only if truly unknown — never guessed
  sourceExplanation: string | null; // preserved verbatim if AI doesn't need to regenerate it
}

const SYSTEM_PROMPT = `Du bist ein erfahrener IHK-Prüfungstrainer. Du bekommst eine IHK-Prüfungsfrage
(meist zu IT/Cyber-Sicherheit) mit Antwortoptionen und der bereits bekannten korrekten Antwort.

Deine Aufgabe: liefere NUR eine strukturierte Erklärung auf DEUTSCH und Metadaten. Du erfindest NIEMALS
Fakten, die nicht durch die Frage, die Optionen oder etabliertes IHK-Fachwissen zum genannten Konzept
gestützt sind. Du änderst NIEMALS die vorgegebene korrekte Antwort.

Die deutsche Erklärung soll für B1/B2-Lernende verständlich sein und hat: eine kurze Zusammenfassung was
die Frage eigentlich fragt, warum die korrekte Antwort richtig ist, warum die anderen Antworten falsch
sind, die typische Falle/das Missverständnis (falls vorhanden), und das geprüfte Konzept. (Diese deutsche
Erklärung wird anschließend maschinell in weitere Sprachen übersetzt — du lieferst nur die deutsche
Fassung.)

Außerdem: bis zu 6 wichtige deutsche Vokabeln aus der Frage, die für das Verständnis oder als IHK-Fachbegriff
wichtig sind — mit Bedeutung auf Englisch, Dari und Hebräisch, plus einer kurzen deutschen Erklärung. Wähle
nur Wörter, die wirklich schwierig oder fachlich wichtig sind, nicht jedes Wort.`;

/**
 * Enriches one question with explanations (DE/EN/Dari/He), topic metadata
 * and vocabulary — in a single structured call to keep AI usage/cost down
 * (see /lib/ai architecture notes). Never called with an unknown correct
 * answer; callers must resolve or flag that before enrichment.
 */
export async function enrichQuestion(input: EnrichmentInput): Promise<QuestionEnrichment> {
  if (!input.correctOptionLabel) {
    throw new Error(
      "enrichQuestion() must not be called with an unresolved correct answer — flag the question for manual review instead."
    );
  }

  const optionsBlock = input.options
    .map((o) => `${o.label}) ${o.text}${o.label === input.correctOptionLabel ? "  [KORREKT]" : ""}`)
    .join("\n");

  const prompt = `Frage: ${input.questionText}

Antwortoptionen:
${optionsBlock}
${
  input.sourceExplanation
    ? `\nVorhandene Quell-Erklärung (falls hilfreich als fachlicher Kontext, muss nicht wörtlich übernommen werden):\n${input.sourceExplanation}`
    : "\n(Keine Quell-Erklärung vorhanden — bitte selbst erklären.)"
}`;

  const { object } = await generateObject({
    model: getEnrichmentModel(),
    schema: questionEnrichmentSchema,
    system: SYSTEM_PROMPT,
    prompt,
    // The caller (enrichQuestionsBatch) already paces requests to stay under
    // the free-tier rate limit and retries failed questions on its own —
    // the SDK's default internal retries would fire in rapid succession and
    // blow through that limit within the same request.
    maxRetries: 0,
  });

  return object;
}

/**
 * Thin, named wrappers kept for architectural clarity per the project spec
 * (generateExplanation / generateVocabulary as separate concerns) even
 * though they share one underlying model call for cost efficiency.
 */
export async function generateQuestionMetadata(input: EnrichmentInput) {
  const result = await enrichQuestion(input);
  return { topic: result.topic, subtopic: result.subtopic, difficulty: result.difficulty, examKeywords: result.examKeywords };
}

export async function generateExplanation(input: EnrichmentInput) {
  const result = await enrichQuestion(input);
  return result.explanationDe;
}

export async function generateVocabulary(input: EnrichmentInput) {
  const result = await enrichQuestion(input);
  return result.vocabulary;
}
