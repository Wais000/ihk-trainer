import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { ResetProgressSection } from "@/components/settings/reset-progress-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";
import { dirFor } from "@/lib/i18n/languages";
import type { ExplanationLanguage } from "@/lib/validation/question";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  const dict = getUiDictionary((settings?.ui_language as ExplanationLanguage) ?? "en");

  // The reset warning is always shown in English, plus the user's chosen
  // translation language (Settings → "Bevorzugte Sprache") if different —
  // so a destructive, irreversible action can't be missed due to a
  // language gap, regardless of which language the menus are set to.
  const explanationLanguage: ExplanationLanguage = settings?.explanation_language ?? "en";
  const warningEnglish = getUiDictionary("en").settings.resetAllWarning;
  const warningSecondary =
    explanationLanguage === "en" ? null : getUiDictionary(explanationLanguage).settings.resetAllWarning;

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              // "de" is a valid stored value (it's still the default column value and
              // is used by the per-question explanation tabs), but isn't offered as a
              // choice here — fall back to "en" so the radio group always has a match.
              explanationLanguage: settings?.explanation_language === "de" || !settings?.explanation_language
                ? "en"
                : settings.explanation_language,
              uiLanguage: settings?.ui_language ?? "en",
              instantTranslation: settings?.instant_translation_enabled ?? true,
              translateQuestion: settings?.translate_question_enabled ?? true,
              translateAnswers: settings?.translate_answers_enabled ?? true,
              translateCorrectAnswer: settings?.translate_correct_answer_enabled ?? true,
              translateExplanation: settings?.translate_explanation_enabled ?? true,
              dailyTarget: settings?.daily_target ?? 100,
              theme: settings?.theme ?? "system",
            }}
          />
        </CardContent>
      </Card>

      <ResetProgressSection
        warningEnglish={warningEnglish}
        warningSecondary={warningSecondary}
        secondaryDir={dirFor(explanationLanguage)}
      />
    </main>
  );
}
