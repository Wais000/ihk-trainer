"use server";

import { createClient } from "@/lib/supabase/server";

/** Permanently deletes this user's answer history (attempts + review
 * schedule) for every question in a category, so a "Retry" starts the
 * category over with no prior correct/incorrect record — a deliberate,
 * confirmed action, not something a normal practice session ever triggers. */
export async function resetTopicHistoryAction(topicId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: questions } = await supabase.from("questions").select("id").eq("user_id", user.id).eq("topic_id", topicId);
  const questionIds = (questions ?? []).map((q) => q.id);
  if (questionIds.length === 0) return { success: true };

  await supabase.from("question_attempts").delete().eq("user_id", user.id).in("question_id", questionIds);
  await supabase.from("review_schedule").delete().eq("user_id", user.id).in("question_id", questionIds);

  return { success: true };
}

/** Same idea as resetTopicHistoryAction, scoped to bookmarked ("marked")
 * questions instead of a topic — used by the /practice/marked session. */
export async function resetMarkedHistoryAction(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("user_id", user.id)
    .eq("marked", true);
  const questionIds = (questions ?? []).map((q) => q.id);
  if (questionIds.length === 0) return { success: true };

  await supabase.from("question_attempts").delete().eq("user_id", user.id).in("question_id", questionIds);
  await supabase.from("review_schedule").delete().eq("user_id", user.id).in("question_id", questionIds);

  return { success: true };
}
