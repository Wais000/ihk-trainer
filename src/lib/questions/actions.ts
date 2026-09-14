"use server";

import { createClient } from "@/lib/supabase/server";
import type { FlagType } from "@/lib/types/database";

/** Every bookmarked ("marked") question id this user can currently
 * practice, oldest-imported first — matches fetchPracticeQueue's own
 * ordering for markedOnly, so the sidebar's numbering lines up with the
 * /practice/marked session's numbering. Powers the always-visible "Marked"
 * widget in the sidebar (see MarkedQuestionsProvider), not just the grid
 * shown while a marked session is actively mounted. */
export async function getMarkedQuestionIdsAction(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("question_marks")
    .select("question_id, questions!inner(status, created_at)")
    .eq("user_id", user.id)
    .eq("questions.status", "ready")
    .order("created_at", { foreignTable: "questions", ascending: true });

  return (data ?? []).map((m) => m.question_id);
}

export async function flagQuestionAction(questionId: string, flagType: FlagType, note: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("question_flags").insert({
    user_id: user.id,
    question_id: questionId,
    flag_type: flagType,
    note,
  });

  return { error: error?.message ?? null };
}
