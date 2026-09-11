import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichQuestion } from "@/lib/ai/enrichment";
import { translateManyFromGerman } from "@/lib/translation/azure-translator";
import type { ExplanationBlock } from "@/lib/validation/question";

// Gemini's free tier caps at 20 requests/minute — one question at a time
// with a pause between each keeps every batch safely under that, at the
// cost of throughput (a personal-scale question bank, so this is fine).
const REQUEST_INTERVAL_MS = 4500;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Azure Translator's Dari code is "prs" (distinct from Persian "fa").
const TRANSLATION_TARGETS: { lang: "en" | "dari" | "he"; azureCode: string }[] = [
  { lang: "en", azureCode: "en" },
  { lang: "dari", azureCode: "prs" },
  { lang: "he", azureCode: "he" },
];
type ExplanationField = keyof ExplanationBlock;

export interface EnrichmentSummary {
  succeeded: string[];
  failed: { questionId: string; error: string }[];
}

/**
 * Enriches a list of questions (already saved to the DB with their raw
 * options) with explanations + vocabulary, one at a time with a pause
 * between each to stay under the AI provider's rate limit. Every question
 * is enriched independently — if one call fails (rate limit, timeout,
 * malformed output), the rest continue and all earlier successes remain
 * saved. Failures are returned so the caller can retry just those.
 */
export async function enrichQuestionsBatch(
  supabase: SupabaseClient,
  questionIds: string[],
  ownerId?: string
): Promise<EnrichmentSummary> {
  const summary: EnrichmentSummary = { succeeded: [], failed: [] };

  for (let i = 0; i < questionIds.length; i++) {
    if (i > 0) await sleep(REQUEST_INTERVAL_MS);

    try {
      await enrichOneQuestion(supabase, questionIds[i], ownerId);
      summary.succeeded.push(questionIds[i]);
    } catch (err) {
      summary.failed.push({
        questionId: questionIds[i],
        error: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  }

  return summary;
}

async function enrichOneQuestion(supabase: SupabaseClient, questionId: string, explicitOwnerId?: string) {
  const { data: question, error: qError } = await supabase
    .from("questions")
    .select("id, question_text, correct_answer_unknown, source")
    .eq("id", questionId)
    .single();
  if (qError || !question) throw new Error(qError?.message ?? "Frage nicht gefunden.");

  if (question.correct_answer_unknown) {
    // Never enrich a question whose correct answer wasn't verified.
    throw new Error("Korrekte Antwort ist unbekannt — Anreicherung übersprungen.");
  }

  const { data: options, error: oError } = await supabase
    .from("question_options")
    .select("id, label, option_text, is_correct")
    .eq("question_id", questionId)
    .order("sort_order");
  if (oError || !options?.length) throw new Error(oError?.message ?? "Antwortoptionen fehlen.");

  const correctOption = options.find((o) => o.is_correct);

  // Look up an existing source explanation (if the import preserved one)
  // to give the model context, without asking it to blindly re-translate it.
  const { data: existingExplanations } = await supabase
    .from("question_explanations")
    .select("language, summary, why_correct, why_incorrect, common_trap")
    .eq("question_id", questionId);
  const sourceExplanation = existingExplanations?.find((e) => e.language === "de")?.summary ?? null;

  const enrichment = await enrichQuestion({
    questionText: question.question_text,
    options: options.map((o) => ({ label: o.label, text: o.option_text, isCorrect: o.is_correct })),
    correctOptionLabel: correctOption?.label ?? null,
    sourceExplanation,
  });

  // Update topic metadata on the question itself.
  const topicId = await ensureTopic(supabase, enrichment.topic, enrichment.subtopic);
  await supabase
    .from("questions")
    .update({
      topic_id: topicId,
      subtopic: enrichment.subtopic,
      difficulty: enrichment.difficulty,
      exam_keywords: enrichment.examKeywords,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  const ownerId = explicitOwnerId ?? (await supabase.auth.getUser()).data.user?.id;
  const explanationDe = enrichment.explanationDe;

  await supabase.from("question_explanations").upsert(
    {
      question_id: questionId,
      owner_id: ownerId,
      language: "de",
      source: "ai_generated" as const,
      summary: explanationDe.summary,
      why_correct: explanationDe.whyCorrect,
      why_incorrect: explanationDe.whyIncorrect,
      common_trap: explanationDe.commonTrap,
      tested_concept: explanationDe.testedConcept,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "question_id,language" }
  );

  // The other three languages are machine-translated from this exact German
  // text (not independently generated), so every language says the same
  // thing. One Azure request handles every non-null field at once.
  const fields: { key: ExplanationField; value: string }[] = [{ key: "summary", value: explanationDe.summary }];
  for (const key of ["whyCorrect", "whyIncorrect", "commonTrap", "testedConcept"] as const) {
    const value = explanationDe[key];
    if (value) fields.push({ key, value });
  }

  const translations = await translateManyFromGerman(
    fields.map((f) => f.value),
    TRANSLATION_TARGETS.map((t) => t.azureCode)
  );

  for (const { lang, azureCode } of TRANSLATION_TARGETS) {
    const block: Partial<Record<ExplanationField, string>> = {};
    fields.forEach((field, i) => {
      const translated = translations[i][azureCode];
      if (translated) block[field.key] = translated;
    });

    await supabase.from("question_explanations").upsert(
      {
        question_id: questionId,
        owner_id: ownerId,
        language: lang,
        source: "ai_generated" as const,
        summary: block.summary ?? explanationDe.summary,
        why_correct: block.whyCorrect ?? null,
        why_incorrect: block.whyIncorrect ?? null,
        common_trap: block.commonTrap ?? null,
        tested_concept: block.testedConcept ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "question_id,language" }
    );
  }

  // Replace vocabulary rows (idempotent: delete then insert).
  await supabase.from("question_vocabulary").delete().eq("question_id", questionId);
  if (enrichment.vocabulary.length > 0) {
    await supabase.from("question_vocabulary").insert(
      enrichment.vocabulary.map((v, idx) => ({
        question_id: questionId,
        owner_id: ownerId,
        german_word: v.germanWord,
        english_meaning: v.englishMeaning,
        dari_meaning: v.dariMeaning,
        hebrew_meaning: v.hebrewMeaning,
        short_german_explanation: v.shortGermanExplanation,
        sort_order: idx,
      }))
    );
  }
}

async function ensureTopic(
  supabase: SupabaseClient,
  topicName: string,
  subtopicName: string | null
): Promise<string | null> {
  const slug = slugify(topicName);
  const { data: existing } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("topics")
    .insert({ name: topicName, slug })
    .select("id")
    .single();
  if (error) return null; // Topic is metadata only — a failed insert shouldn't fail the whole enrichment.
  void subtopicName; // subtopic is stored on the question row itself, not as a separate topics row
  return created.id;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
