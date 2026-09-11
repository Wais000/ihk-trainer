"use server";

import { createClient } from "@/lib/supabase/server";
import type { FlagType } from "@/lib/types/database";

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
