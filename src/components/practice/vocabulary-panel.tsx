"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LANGUAGE_LABELS, dirFor } from "@/lib/i18n/languages";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import type { SessionVocabularyItem } from "@/components/practice/types";
import type { ExplanationLanguage } from "@/lib/validation/question";

export interface VocabularyPanelProps {
  items: SessionVocabularyItem[];
  /** The user's preferred non-German language (from Settings) — the only
   * translation column shown besides German. */
  secondaryLanguage: ExplanationLanguage;
}

function meaningFor(item: SessionVocabularyItem, lang: ExplanationLanguage): string | null {
  if (lang === "en") return item.english_meaning;
  if (lang === "dari") return item.dari_meaning;
  if (lang === "he") return item.hebrew_meaning;
  return null;
}

export function VocabularyPanel({ items, secondaryLanguage }: VocabularyPanelProps) {
  const [open, setOpen] = useState(false);
  const dict = useUiDictionary();
  if (items.length === 0) return null;

  const selected = secondaryLanguage === "de" ? "en" : secondaryLanguage;
  // English is always shown; the selected language is added alongside it,
  // unless it's English itself (avoid a duplicate column).
  const languages: ExplanationLanguage[] = selected === "en" ? ["en"] : ["en", selected];

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {formatTemplate(dict.common.importantWords, { count: items.length })}
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">{dict.common.germanColumnHeader}</th>
                {languages.map((lang) => (
                  <th key={lang} className="px-3 py-2 font-medium">
                    {LANGUAGE_LABELS[lang]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{item.german_word}</td>
                  {languages.map((lang) => (
                    <td key={lang} className="px-3 py-2" dir={dirFor(lang)}>
                      {meaningFor(item, lang) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
