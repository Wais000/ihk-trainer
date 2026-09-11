import { createClient } from "@/lib/supabase/server";
import { getUiDictionary } from "./dictionary";
import type { UiDictionary } from "./dictionary";
import type { ExplanationLanguage } from "@/lib/validation/question";

/** Fetches the current user's menu-language dictionary for use in Server
 * Components (which can't use the client-side useUiDictionary() hook).
 * Defaults to English when logged out or no preference is set. */
export async function getUiDict(): Promise<{ dict: UiDictionary; lang: ExplanationLanguage }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let lang: ExplanationLanguage = "en";
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("ui_language")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settings?.ui_language) lang = settings.ui_language;
  }

  return { dict: getUiDictionary(lang), lang };
}
