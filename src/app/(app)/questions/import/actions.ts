"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseQuestionPaste } from "@/lib/parsing/question-parser";
import { normalizeQuestionText, findLikelyDuplicate } from "@/lib/parsing/duplicate-detection";
import { enrichQuestionsBatch } from "@/lib/ai/batch-enrichment";
import type { ParsedQuestion, ExplanationLanguage } from "@/lib/validation/question";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";

/** Looks up the current user's menu-language dictionary for use in this
 * "use server" actions file (which can't use the client-side hook or the
 * Server-Component-only getUiDict() helper). Defaults to English when
 * logged out or no preference is set. */
async function getDictForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | undefined
) {
  if (!userId) return getUiDictionary("en");
  const { data: settings } = await supabase
    .from("user_settings")
    .select("ui_language")
    .eq("user_id", userId)
    .maybeSingle();
  return getUiDictionary((settings?.ui_language as ExplanationLanguage) ?? "en");
}

export interface ImportActionState {
  error: string | null;
}

/**
 * Parses the pasted text and immediately saves every item as an
 * `import_items` row — including ones the parser couldn't fully make
 * sense of — before anything else happens. Raw pasted text is never lost,
 * per the project's "never lose imported questions" requirement.
 */
export async function createImportAction(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const rawText = (formData.get("rawText") as string)?.trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dict = await getDictForUser(supabase, user?.id);

  if (!rawText) {
    return { error: dict.importFlow.emptyTextError };
  }

  if (!user) return { error: dict.importFlow.notLoggedIn };

  const parsed = parseQuestionPaste(rawText);
  if (parsed.length === 0) {
    return { error: dict.importFlow.noQuestionsDetected };
  }

  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({ user_id: user.id, raw_text: rawText, status: "processing", total_items: parsed.length })
    .select("id")
    .single();
  if (importError || !importRow) return { error: importError?.message ?? dict.importFlow.createFailed };

  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("id, question_text_normalized")
    .eq("user_id", user.id)
    .not("question_text_normalized", "is", null);

  const existingCandidates = (existingQuestions ?? []).map((q) => ({
    id: q.id,
    questionTextNormalized: q.question_text_normalized as string,
  }));

  for (const item of parsed) {
    const normalized = normalizeQuestionText(item.questionText);
    const duplicate = findLikelyDuplicate(normalized, existingCandidates);
    const status = duplicate ? "duplicate" : item.correctAnswerUnknown ? "needs_review" : "parsed";

    await supabase.from("import_items").insert({
      import_id: importRow.id,
      user_id: user.id,
      raw_text: item.questionText,
      parsed: item as ParsedQuestion,
      status,
    });

    // Newly-parsed items also count as candidates for duplicate checks against each other.
    existingCandidates.push({ id: "", questionTextNormalized: normalized });
  }

  await supabase
    .from("imports")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", importRow.id);

  redirect(`/questions/import/${importRow.id}`);
}

/** Saves one reviewed import item as a real question (+ options, + preserved source explanation). */
export async function saveImportItemAction(itemId: string, correctLabelOverride?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dict = await getDictForUser(supabase, user?.id);
  if (!user) return { error: dict.importFlow.notLoggedIn };

  const { data: item, error: itemError } = await supabase
    .from("import_items")
    .select("id, import_id, parsed, status")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: dict.importFlow.itemNotFound };

  const parsed = item.parsed as unknown as ParsedQuestion;
  const correctLabel =
    correctLabelOverride ?? parsed.options.find((o) => o.isCorrect)?.label ?? null;

  if (!correctLabel) {
    return { error: dict.importFlow.selectCorrectAnswerBeforeSaving };
  }

  try {
    const { data: question, error: qError } = await supabase
      .from("questions")
      .insert({
        user_id: user.id,
        import_item_id: item.id,
        question_text: parsed.questionText,
        question_text_normalized: normalizeQuestionText(parsed.questionText),
        source: parsed.source,
        status: "ready",
        correct_answer_unknown: false,
      })
      .select("id")
      .single();
    if (qError || !question) throw new Error(qError?.message ?? dict.importFlow.saveFailed);

    await supabase.from("question_options").insert(
      parsed.options.map((o, idx) => ({
        question_id: question.id,
        owner_id: user.id,
        label: o.label,
        option_text: o.text,
        is_correct: o.label === correctLabel,
        sort_order: idx,
      }))
    );

    if (parsed.sourceExplanation) {
      await supabase.from("question_explanations").insert({
        question_id: question.id,
        owner_id: user.id,
        language: "de",
        source: "source",
        summary: parsed.sourceExplanation,
      });
    }

    await supabase
      .from("import_items")
      .update({ status: "saved", question_id: question.id, error_message: null })
      .eq("id", item.id);

    revalidatePath(`/questions/import/${item.import_id}`);
    return { error: null, questionId: question.id as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : dict.importFlow.unknownSaveError;
    await supabase.from("import_items").update({ status: "failed", error_message: message }).eq("id", item.id);
    revalidatePath(`/questions/import/${item.import_id}`);
    return { error: message };
  }
}

/** Saves every item currently in "parsed" (unambiguous, non-duplicate) state in one go. */
export async function saveAllReadyItemsAction(importId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("import_items")
    .select("id")
    .eq("import_id", importId)
    .eq("status", "parsed");

  for (const item of items ?? []) {
    await saveImportItemAction(item.id);
  }
  revalidatePath(`/questions/import/${importId}`);
}

/** Runs AI enrichment (explanations + vocabulary) for every saved question from this import that doesn't have it yet. */
export async function enrichImportAction(importId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("import_items")
    .select("question_id")
    .eq("import_id", importId)
    .eq("status", "saved")
    .not("question_id", "is", null);

  const questionIds = (items ?? []).map((i) => i.question_id as string);
  if (questionIds.length === 0) return { succeeded: 0, failed: 0 };

  const summary = await enrichQuestionsBatch(supabase, questionIds);
  revalidatePath(`/questions/import/${importId}`);
  return { succeeded: summary.succeeded.length, failed: summary.failed.length, failures: summary.failed };
}
