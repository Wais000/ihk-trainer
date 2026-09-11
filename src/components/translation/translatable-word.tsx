"use client";

import { useState } from "react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getWordTranslationAction } from "@/app/actions/translation";
import type { WordTranslation } from "@/lib/validation/translation";

const HOVER_OPEN_DELAY_MS = 350;

export function TranslatableWord({ word, sentence }: { word: string; sentence?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordTranslation | null>(null);

  async function handleOpenChange(open: boolean) {
    if (!open || result || loading) return;
    setLoading(true);
    const translation = await getWordTranslationAction(word, sentence);
    setResult(translation);
    setLoading(false);
  }

  // Exactly one of these is ever non-null — the server action already
  // filters the translation down to the user's single preferred language.
  const meaning = result?.englishMeaning ?? result?.dariMeaning ?? result?.hebrewMeaning ?? null;
  const isRtlMeaning = Boolean(result?.dariMeaning || result?.hebrewMeaning);

  return (
    <TooltipProvider delayDuration={HOVER_OPEN_DELAY_MS}>
      <Tooltip onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="rounded-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {word}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="mb-2 font-semibold">{word}</p>
          {loading && <p className="text-sm text-muted-foreground">Lädt…</p>}
          {!loading && meaning && (
            <p className="text-sm" dir={isRtlMeaning ? "rtl" : "ltr"}>
              {meaning}
            </p>
          )}
          {!loading && !meaning && (
            <p className="text-sm text-muted-foreground">Keine Übersetzung verfügbar.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
