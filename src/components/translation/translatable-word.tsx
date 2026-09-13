"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getWordTranslationAction } from "@/app/actions/translation";
import { addVocabularyWordAction } from "@/lib/vocabulary/actions";
import type { WordTranslation } from "@/lib/validation/translation";

const HOVER_OPEN_DELAY_MS = 350;

export function TranslatableWord({ word }: { word: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordTranslation | null>(null);
  // "idle" -> not yet clicked; "saving" -> request in flight (blocks
  // re-clicks); "saved" -> confirmed in the vocabulary library, whether it
  // was just added or already there — either way, no interrupting alert,
  // just a quiet checkmark so it doesn't break the reading/practice flow.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleOpenChange(open: boolean) {
    if (!open || result || loading) return;
    setLoading(true);
    const translation = await getWordTranslationAction(word);
    setResult(translation);
    setLoading(false);
  }

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (saveState !== "idle") return;
    setSaveState("saving");
    try {
      const result = await addVocabularyWordAction(word);
      if ("item" in result || result.error === "duplicate") {
        setSaveState("saved");
      } else {
        console.error("addVocabularyWordAction failed:", result.error);
        setSaveState("idle");
      }
    } catch (err) {
      console.error("addVocabularyWordAction failed:", err);
      setSaveState("idle");
    }
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
            onClick={handleClick}
            aria-label={saveState === "saved" ? `${word} — in vocabulary` : word}
            className="rounded-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {word}
            {saveState === "saved" && <Check className="ml-0.5 inline size-2.5 align-super text-success" />}
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
