"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsActionState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LANGUAGE_LABELS } from "@/lib/i18n/languages";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import type { ExplanationLanguage } from "@/lib/validation/question";
import type { AppTheme } from "@/lib/types/database";

export interface SettingsFormValues {
  explanationLanguage: ExplanationLanguage;
  uiLanguage: ExplanationLanguage;
  instantTranslation: boolean;
  dailyTarget: number;
  theme: AppTheme;
}

const initialState: SettingsActionState = { error: null, success: null };

// Applying the new theme is done here, immediately on click, rather than
// waiting for the server action + revalidation to re-render the root
// layout: Next.js doesn't reliably re-apply attributes on the already-
// mounted <html> element after a server-action-triggered refresh, so
// without this, picking Light/System visually did nothing until a full
// page reload.
function applyThemeImmediately(pref: AppTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme-pref", pref);
  if (pref === "system") {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  } else {
    root.classList.toggle("dark", pref === "dark");
  }
}
// German isn't offered here — it's the base language of the questions
// themselves, so "translate into German" / "explain in German by default"
// isn't a meaningful preference. The per-question explanation panel still
// has its own Deutsch tab for questions with a German source explanation.
const EXPLANATION_LANGUAGES: ExplanationLanguage[] = ["en", "dari", "he"];
// The menu language is unrelated to question/explanation content, so all
// four languages (including German) are valid choices here.
const MENU_LANGUAGES: ExplanationLanguage[] = ["en", "de", "dari", "he"];

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);
  const dict = useUiDictionary();
  const themes: { value: AppTheme; label: string }[] = [
    { value: "system", label: dict.settings.themeSystem },
    { value: "light", label: dict.settings.themeLight },
    { value: "dark", label: dict.settings.themeDark },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <Label>{dict.settings.menuLanguageLabel}</Label>
        <p className="text-sm text-muted-foreground">{dict.settings.menuLanguageHelp}</p>
        <div className="flex flex-wrap gap-2">
          {MENU_LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="radio" name="uiLanguage" value={lang} defaultChecked={initial.uiLanguage === lang} />
              {LANGUAGE_LABELS[lang]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <Label>{dict.settings.preferredLanguageLabel}</Label>
        <p className="text-sm text-muted-foreground">{dict.settings.preferredLanguageHelp}</p>
        <div className="flex flex-wrap gap-2">
          {EXPLANATION_LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="radio" name="explanationLanguage" value={lang} defaultChecked={initial.explanationLanguage === lang} />
              {LANGUAGE_LABELS[lang]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <Label>{dict.settings.translationSectionLabel}</Label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="instantTranslation" defaultChecked={initial.instantTranslation} />
          {dict.settings.instantTranslationLabel}
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dailyTarget">{dict.settings.dailyTargetLabel}</Label>
        <Input id="dailyTarget" name="dailyTarget" type="number" min={1} max={500} defaultValue={initial.dailyTarget} className="w-32" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <Label>{dict.settings.themeLabel}</Label>
        <div className="flex gap-2">
          {themes.map((t) => (
            <label key={t.value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                type="radio"
                name="theme"
                value={t.value}
                defaultChecked={initial.theme === t.value}
                onChange={() => applyThemeImmediately(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending} size="lg" className="self-start">
        {pending ? dict.settings.saving : dict.settings.save}
      </Button>
    </form>
  );
}
