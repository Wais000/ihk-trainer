"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";
import type { ExplanationLanguage } from "@/lib/validation/question";

import { EXAM_QUESTION_COUNT, EXAM_DURATION_SECONDS } from "@/lib/exam/constants";

export async function startExamAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: getUiDictionary("en").exam.notLoggedIn };

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ui_language")
    .eq("user_id", user.id)
    .maybeSingle();
  const dict = getUiDictionary((settings?.ui_language as ExplanationLanguage) ?? "en");

  const { data: candidates } = await supabase
    .from("questions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "ready");

  if (!candidates || candidates.length === 0) {
    return { error: dict.exam.noQuestionsYet };
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(EXAM_QUESTION_COUNT, shuffled.length));

  const { data: session, error } = await supabase
    .from("exam_sessions")
    .insert({ user_id: user.id, status: "in_progress", total_questions: selected.length })
    .select("id")
    .single();
  if (error || !session) return { error: error?.message ?? dict.exam.failedToStart };

  await supabase.from("exam_answers").insert(
    selected.map((q, idx) => ({
      exam_session_id: session.id,
      user_id: user.id,
      question_id: q.id,
      sort_order: idx,
    }))
  );

  redirect(`/exam/${session.id}`);
}

export async function submitExamAnswerAction(input: {
  examAnswerId: string;
  selectedOptionId: string | null;
  markedForReview: boolean;
  timeTakenSeconds: number | null;
}) {
  const supabase = await createClient();

  let isCorrect: boolean | null = null;
  if (input.selectedOptionId) {
    const { data: option } = await supabase
      .from("question_options")
      .select("is_correct")
      .eq("id", input.selectedOptionId)
      .single();
    isCorrect = option?.is_correct ?? null;
  }

  await supabase
    .from("exam_answers")
    .update({
      selected_option_id: input.selectedOptionId,
      is_correct: isCorrect,
      marked_for_review: input.markedForReview,
      time_taken_seconds: input.timeTakenSeconds,
    })
    .eq("id", input.examAnswerId);
}

export async function finishExamAction(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: answers } = await supabase
    .from("exam_answers")
    .select("is_correct, selected_option_id")
    .eq("exam_session_id", sessionId);

  const correct = answers?.filter((a) => a.is_correct === true).length ?? 0;
  const incorrect = answers?.filter((a) => a.is_correct === false).length ?? 0;
  const skipped = answers?.filter((a) => a.selected_option_id === null).length ?? 0;

  const { data: startedSession } = await supabase
    .from("exam_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .single();
  const startedAt = startedSession?.started_at ? new Date(startedSession.started_at) : new Date();
  const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);

  await supabase
    .from("exam_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      duration_seconds: Math.min(durationSeconds, EXAM_DURATION_SECONDS),
      correct_count: correct,
      incorrect_count: incorrect,
      skipped_count: skipped,
    })
    .eq("id", sessionId);

  // Exam answers also count as attempts, so exam mistakes feed into Review Mode too.
  const { data: fullAnswers } = await supabase
    .from("exam_answers")
    .select("question_id, selected_option_id, is_correct")
    .eq("exam_session_id", sessionId);

  for (const answer of fullAnswers ?? []) {
    await supabase.from("question_attempts").insert({
      user_id: user.id,
      question_id: answer.question_id,
      mode: "exam",
      selected_option_id: answer.selected_option_id,
      is_correct: answer.is_correct ?? false,
      skipped: answer.selected_option_id === null,
      guessed: false,
    });
  }

  redirect(`/exam/${sessionId}/results`);
}
