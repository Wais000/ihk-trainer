"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UiDictionary } from "@/lib/i18n/ui/dictionary";
import type { ExplanationLanguage } from "@/lib/validation/question";

interface UiI18nContextValue {
  dict: UiDictionary;
  lang: ExplanationLanguage;
}

const UiI18nContext = createContext<UiI18nContextValue | null>(null);

/** Provides the UI-chrome dictionary (menus, buttons, labels) app-wide.
 * Completely separate from the "Bevorzugte Sprache" (explanation_language)
 * setting, which only affects question/explanation/vocabulary content. */
export function UiI18nProvider({
  dict,
  lang,
  children,
}: {
  dict: UiDictionary;
  lang: ExplanationLanguage;
  children: ReactNode;
}) {
  return <UiI18nContext.Provider value={{ dict, lang }}>{children}</UiI18nContext.Provider>;
}

export function useUiDictionary(): UiDictionary {
  const ctx = useContext(UiI18nContext);
  if (!ctx) throw new Error("useUiDictionary must be used within UiI18nProvider");
  return ctx.dict;
}

export function useUiLanguage(): ExplanationLanguage {
  const ctx = useContext(UiI18nContext);
  if (!ctx) throw new Error("useUiLanguage must be used within UiI18nProvider");
  return ctx.lang;
}
