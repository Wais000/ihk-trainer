"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { LANGUAGE_LABELS, dirFor } from "@/lib/i18n/languages";
import { splitByLetterReferences } from "@/lib/text/format-explanation";
import type { ExplanationLanguage } from "@/lib/validation/question";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";

export interface ExplanationBlock {
  summary: string;
  whyCorrect: string | null;
  whyIncorrect: string | null;
  commonTrap: string | null;
  testedConcept: string | null;
}

export interface ExplanationViewProps {
  explanations: Partial<Record<ExplanationLanguage, ExplanationBlock>>;
  /** The user's preferred non-German language (from Settings) — shown
   * directly below the German explanation, always both at once. */
  secondaryLanguage: ExplanationLanguage;
  /** Letter of the correct option (e.g. "C"), shown before the "✓" line. */
  correctLabel: string;
}

// A why-incorrect chunk starts with the referenced answer letter followed
// by a space (see splitByLetterReferences) — pull it out so it can be
// styled as a bold colored prefix, matching the reference design.
function splitLetterPrefix(text: string): [string, string] | null {
  const match = text.match(/^([A-H])\s+([\s\S]*)$/);
  return match ? [match[1], match[2]] : null;
}

export function ExplanationView({ explanations, secondaryLanguage, correctLabel }: ExplanationViewProps) {
  const dict = useUiDictionary();
  const [showWhyWrong, setShowWhyWrong] = useState(false);
  const languages: ExplanationLanguage[] = secondaryLanguage === "de" ? ["de"] : ["de", secondaryLanguage];
  const hasWhyWrong = languages.some((lang) => explanations[lang]?.whyIncorrect || explanations[lang]?.commonTrap);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{dict.explanationView.correctAnswerLabel}</p>
        <p className="text-sm font-semibold text-foreground">{correctLabel}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{dict.explanationView.explanationLabel}</p>
        {languages.map((lang) => {
          const block = explanations[lang];
          return (
            <div key={lang} dir={dirFor(lang)} className="text-sm leading-relaxed text-foreground">
              {block ? (
                block.whyCorrect && <p>{block.whyCorrect}</p>
              ) : (
                <p className="text-muted-foreground">
                  {formatTemplate(dict.explanationView.generatingFor, { language: LANGUAGE_LABELS[lang] })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hasWhyWrong && (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setShowWhyWrong((v) => !v)}
            aria-expanded={showWhyWrong}
            className="flex items-center gap-1.5 self-start text-xs font-bold uppercase tracking-wide text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showWhyWrong ? dict.explanationView.hide : dict.explanationView.whyWasItWrong}
            <ChevronDown className={`size-3.5 transition-transform ${showWhyWrong ? "rotate-180" : ""}`} />
          </button>

          {showWhyWrong && (
            <div className="flex flex-col gap-2">
              {languages.map((lang) => {
                const block = explanations[lang];
                if (!block || (!block.whyIncorrect && !block.commonTrap)) return null;
                return (
                  <div key={lang} dir={dirFor(lang)} className="flex flex-col gap-2">
                    {block.whyIncorrect &&
                      splitByLetterReferences(block.whyIncorrect).map((reason, i) => {
                        const split = splitLetterPrefix(reason);
                        return (
                          <p
                            key={i}
                            className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-foreground"
                          >
                            {split ? (
                              <>
                                <span className="font-semibold text-destructive">{split[0]}:</span> {split[1]}
                              </>
                            ) : (
                              reason
                            )}
                          </p>
                        );
                      })}
                    {block.commonTrap && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{dict.explanationView.commonTrap}</span>
                        {block.commonTrap}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
