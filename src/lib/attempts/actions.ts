"use server";

import { createClient } from "@/lib/supabase/server";
import { computeNextReview } from "@/lib/srs/schedule";
import type { MistakeCategory } from "@/lib/validation/question";

export interface RecordAttemptInput {
  questionId: string;
  selectedOptionId: string | null;
  mode: "practice" | "review";
  skipped: boolean;
  guessed: boolean;
  timeTakenSeconds: number | null;
  mistakeCategory?: MistakeCategory | null;
}

export interface RecordAttemptResult {
  attemptId: string;
  isCorrect: boolean;
  correctOptionId: string | null;
}

export async function recordAttemptAction(input: RecordAttemptInput): Promise<RecordAttemptResult | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: options } = await supabase
    .from("question_options")
    .select("id, is_correct")
    .eq("question_id", input.questionId);

  const correctOption = options?.find((o) => o.is_correct) ?? null;
  const isCorrect = !input.skipped && input.selectedOptionId === (correctOption?.id ?? "__none__");

  const { count: previousAttempts } = await supabase
    .from("question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("question_id", input.questionId);

  const { data: insertedAttempt } = await supabase
    .from("question_attempts")
    .insert({
      user_id: user.id,
      question_id: input.questionId,
      mode: input.mode,
      selected_option_id: input.selectedOptionId,
      is_correct: isCorrect,
      skipped: input.skipped,
      guessed: input.guessed,
      time_taken_seconds: input.timeTakenSeconds,
      attempt_number: (previousAttempts ?? 0) + 1,
      mistake_category: input.mistakeCategory ?? (isCorrect || input.skipped ? null : "F"),
    })
    .select("id")
    .single();

  const { data: existingSchedule } = await supabase
    .from("review_schedule")
    .select("consecutive_correct, consecutive_wrong")
    .eq("user_id", user.id)
    .eq("question_id", input.questionId)
    .maybeSingle();

  const next = computeNextReview(
    { consecutive_correct: existingSchedule?.consecutive_correct ?? 0, consecutive_wrong: existingSchedule?.consecutive_wrong ?? 0 },
    isCorrect
  );

  await supabase.from("review_schedule").upsert(
    {
      user_id: user.id,
      question_id: input.questionId,
      last_attempt_at: new Date().toISOString(),
      ...next,
    },
    { onConflict: "user_id,question_id" }
  );

  await supabase.from("activity_log").insert({
    user_id: user.id,
    event_type: "question_answered",
    question_id: input.questionId,
    metadata: { mode: input.mode, is_correct: isCorrect, skipped: input.skipped, guessed: input.guessed },
  });

  return { attemptId: insertedAttempt?.id ?? "", isCorrect, correctOptionId: correctOption?.id ?? null };
}

/** Lets the learner correct the auto-detected mistake category after the fact. */
export async function updateMistakeCategoryAction(attemptId: string, category: MistakeCategory) {
  const supabase = await createClient();
  await supabase
    .from("question_attempts")
    .update({ mistake_category: category, mistake_category_corrected: true })
    .eq("id", attemptId);
}

export async function toggleFavoriteAction(questionId: string, favorite: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("questions").update({ favorite }).eq("id", questionId);

  if (favorite) {
    await supabase.from("favorites").upsert(
      { user_id: user.id, question_id: questionId },
      { onConflict: "user_id,question_id" }
    );
  } else {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("question_id", questionId);
  }
}

/** "Marked" is deliberately separate from `favorite` — a lightweight "come
 * back to this later" flag you can set mid-practice, not the star bookmark. */
export async function toggleMarkedAction(questionId: string, marked: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("questions").update({ marked }).eq("id", questionId).eq("user_id", user.id);
}
