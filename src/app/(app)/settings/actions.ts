"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";
import type { ExplanationLanguage } from "@/lib/validation/question";

export interface SettingsActionState {
  error: string | null;
  success: string | null;
}

/** Called directly from a client component (not via a <form>) whenever the
 * explanation-language tabs change, so the choice is remembered next time. */
export async function setExplanationLanguageAction(language: ExplanationLanguage) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, explanation_language: language, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

export async function updateSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: getUiDictionary("en").settings.notLoggedIn, success: null };

  const { data: currentSettings } = await supabase
    .from("user_settings")
    .select("ui_language")
    .eq("user_id", user.id)
    .maybeSingle();
  const dict = getUiDictionary((currentSettings?.ui_language as ExplanationLanguage) ?? "en");

  const dailyTargetRaw = formData.get("dailyTarget");
  const dailyTarget = dailyTargetRaw ? Number(dailyTargetRaw) : 100;
  if (!Number.isFinite(dailyTarget) || dailyTarget < 1 || dailyTarget > 500) {
    return { error: dict.settings.dailyTargetRangeError, success: null };
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      explanation_language: (formData.get("explanationLanguage") as string) ?? "en",
      ui_language: (formData.get("uiLanguage") as string) ?? "en",
      instant_translation_enabled: formData.get("instantTranslation") === "on",
      translate_question_enabled: formData.get("translateQuestion") === "on",
      translate_answers_enabled: formData.get("translateAnswers") === "on",
      translate_correct_answer_enabled: formData.get("translateCorrectAnswer") === "on",
      translate_explanation_enabled: formData.get("translateExplanation") === "on",
      daily_target: dailyTarget,
      theme: (formData.get("theme") as string) ?? "system",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message, success: null };
  }

  // The menu language affects the root layout (html lang/dir + the whole
  // dictionary provider), not just this page, so revalidate the full tree.
  revalidatePath("/", "layout");
  return { error: null, success: dict.settings.savedSuccess };
}

/** Deletes every practice/exam progress record for this user — attempts,
 * spaced-repetition schedule, exam sessions, and the activity log — across
 * every category and question, and clears the "marked" flag on every
 * question (Correct/Wrong/Due are derived from attempts and review_schedule,
 * so clearing those already resets them; marked lives in its own per-user
 * table and needs its own delete). Deliberately leaves the user's imported questions,
 * vocabulary, and favorites untouched; this is a progress reset, not an
 * account wipe. A destructive, explicitly confirmed action from Settings,
 * never triggered as a side effect of anything else. */
export async function resetAllProgressAction(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: examSessions } = await supabase.from("exam_sessions").select("id").eq("user_id", user.id);
  const examSessionIds = (examSessions ?? []).map((s) => s.id);

  const results = await Promise.all([
    supabase.from("question_attempts").delete().eq("user_id", user.id),
    supabase.from("review_schedule").delete().eq("user_id", user.id),
    supabase.from("activity_log").delete().eq("user_id", user.id),
    supabase.from("exam_answers").delete().eq("user_id", user.id),
    examSessionIds.length > 0
      ? supabase.from("exam_sessions").delete().eq("user_id", user.id)
      : Promise.resolve({ error: null }),
    supabase.from("question_marks").delete().eq("user_id", user.id),
  ]);

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("resetAllProgressAction failed:", failed.error);
    return { error: failed.error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
