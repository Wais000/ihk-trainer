"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import { dirFor, LANGUAGE_LABELS } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DEMO_CORRECT_LABEL,
  DEMO_EXPLANATION,
  DEMO_GLOSSARY,
  DEMO_OPTIONS,
  DEMO_QUESTION_NUMBER,
  DEMO_QUESTION_TEXT,
  DEMO_QUESTION_TOTAL,
  type DemoOptionLabel,
} from "@/lib/landing/demo-content";
import type { ExplanationLanguage } from "@/lib/validation/question";

const WORD_SPLIT_RE = /(\p{L}+)/gu;
const TARGET_LANGUAGES: ExplanationLanguage[] = ["en", "dari", "he"];

function findGlossaryEntry(token: string) {
  const lower = token.toLowerCase();
  return DEMO_GLOSSARY.find((entry) => lower.startsWith(entry.word.toLowerCase()));
}

export function TryQuestionDemo() {
  const dict = useUiDictionary().landing;
  const [targetLang, setTargetLang] = useState<ExplanationLanguage>("en");
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [selected, setSelected] = useState<DemoOptionLabel | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);

  const parts = DEMO_QUESTION_TEXT.split(WORD_SPLIT_RE);
  const activeEntry = activeWord ? findGlossaryEntry(activeWord) : null;
  const isDone = confirmed || answerShown;
  const isCorrect = confirmed && selected === DEMO_CORRECT_LABEL;

  function meaningFor(entry: (typeof DEMO_GLOSSARY)[number]) {
    if (targetLang === "dari") return entry.dari;
    if (targetLang === "he") return entry.he;
    return entry.en;
  }

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
  }

  function handleShowAnswer() {
    setAnswerShown(true);
  }

  function handleReset() {
    setSelected(null);
    setConfirmed(false);
    setAnswerShown(false);
    setActiveWord(null);
  }

  const verdictText = answerShown
    ? dict.verdictAnswerShown
    : confirmed
      ? isCorrect
        ? dict.verdictCorrect
        : dict.verdictIncorrect
      : selected
        ? dict.verdictNowConfirm
        : dict.verdictPickOption;

  const explanationDe = DEMO_EXPLANATION.de;
  const explanationTarget = targetLang !== "de" ? DEMO_EXPLANATION[targetLang] : null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {formatTemplate(dict.tryQuestionOf, {
            current: DEMO_QUESTION_NUMBER,
            total: DEMO_QUESTION_TOTAL,
          })}
        </span>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{dict.translateInto}</span>
          <div role="radiogroup" aria-label={dict.translateInto} className="flex gap-1">
            {TARGET_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={targetLang === lang}
                onClick={() => setTargetLang(lang)}
                className={cn(
                  "rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors",
                  targetLang === lang
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p lang="de" className="text-lg leading-relaxed">
        {parts.map((part, i) => {
          if (i % 2 !== 1) return <span key={i}>{part}</span>;
          const entry = findGlossaryEntry(part);
          if (!entry) return <span key={i}>{part}</span>;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveWord(part)}
              className="rounded-sm underline decoration-dotted decoration-2 underline-offset-4 hover:bg-accent"
            >
              {part}
            </button>
          );
        })}
      </p>

      {activeEntry && (
        <div
          role="region"
          aria-live="polite"
          dir={dirFor(targetLang)}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-accent/50 p-3 text-sm"
        >
          <div>
            <p className="font-semibold" dir="ltr">
              {activeWord}
            </p>
            <p className="mt-1">{meaningFor(activeEntry)}</p>
            <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
              {activeEntry.gloss}
            </p>
            <p dir="ltr" className="mt-2 flex items-center gap-1 text-xs text-success">
              <Check className="size-3" />
              {dict.savedToVocabularyNote}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActiveWord(null)}>
            {dict.closeWord}
          </Button>
        </div>
      )}

      <div role="radiogroup" aria-label={dict.tryHeading} className="flex flex-col gap-2">
        {DEMO_OPTIONS.map((option) => {
          const isChecked = selected === option.label;
          const isRevealedCorrect = isDone && option.label === DEMO_CORRECT_LABEL;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={isChecked}
              disabled={isDone}
              onClick={() => setSelected(option.label)}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default",
                isRevealedCorrect
                  ? "border-success bg-success/10"
                  : isChecked
                    ? "border-primary bg-accent"
                    : "border-border bg-transparent hover:bg-accent/50"
              )}
            >
              <span className="font-semibold">{option.label}</span>
              <span lang="de">{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm font-medium">
          {verdictText}
        </p>
        <div className="flex gap-2">
          {!isDone && (
            <Button variant="outline" size="sm" onClick={handleShowAnswer}>
              {dict.showAnswer}
            </Button>
          )}
          {!isDone && (
            <Button size="sm" disabled={!selected} onClick={handleConfirm}>
              {dict.confirm}
            </Button>
          )}
          {isDone && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              {dict.examRunAgain}
            </Button>
          )}
        </div>
      </div>

      {isDone && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dict.afterConfirmKicker}
          </p>
          <p className="text-sm text-muted-foreground">{dict.afterConfirmP1}</p>
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm" lang="de">
            <p>
              <span className="font-semibold">{dict.correctAnswerLabel}: </span>
              {DEMO_CORRECT_LABEL} —{" "}
              {DEMO_OPTIONS.find((o) => o.label === DEMO_CORRECT_LABEL)?.text}
            </p>
            <p className="mt-2">{explanationDe.summary}</p>
            <p className="mt-2">{explanationDe.whyCorrect}</p>
            <p className="mt-2">
              <span className="font-semibold">{dict.commonTrapLabel}</span>
              {explanationDe.commonTrap}
            </p>
          </div>
          {explanationTarget && (
            <div
              className="rounded-md border border-border bg-accent/30 p-3 text-sm"
              dir={dirFor(targetLang)}
            >
              <p>{explanationTarget.summary}</p>
              <p className="mt-2">{explanationTarget.whyCorrect}</p>
              <p className="mt-2">
                <span className="font-semibold">{dict.commonTrapLabel}</span>
                {explanationTarget.commonTrap}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{dict.afterConfirmP2}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{dict.tryFootnote}</p>
    </div>
  );
}
