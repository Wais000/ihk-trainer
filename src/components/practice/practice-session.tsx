"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Eye, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { recordAttemptAction } from "@/lib/attempts/actions";
import { getQuestionTranslationAction, getOptionTranslationAction } from "@/app/actions/translation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VocabularyPanel } from "@/components/practice/vocabulary-panel";
import { ShortcutHelp } from "@/components/practice/shortcut-help";
import { MarkToggle } from "@/components/questions/mark-toggle";
import { ExplanationView } from "@/components/questions/explanation-view";
import { TranslatableText } from "@/components/translation/translatable-text";
import { splitIntoSentences } from "@/lib/text/format-explanation";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import type { ExplanationLanguage } from "@/lib/validation/question";
import type { SessionQuestion } from "@/components/practice/types";
import type { SidebarQuestionStatus } from "@/components/practice/practice-sidebar-context";
import type { QuestionHistoryEntry } from "@/lib/questions/fetch-session-questions";

export interface PracticeSessionProgress {
  questionIds: string[];
  statuses: SidebarQuestionStatus[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export interface PracticeSessionProps {
  questions: SessionQuestion[];
  mode: "practice" | "review";
  instantTranslationEnabled: boolean;
  /** Four independent Settings toggles for full-sentence translation,
   * separate from word-hover translation (instantTranslationEnabled) —
   * a learner may want only some of these on at once. */
  translateQuestionEnabled: boolean;
  translateAnswersEnabled: boolean;
  /** Shows just the correct option's translation once it's revealed
   * (submitted or "show answer"), even when translateAnswersEnabled is off
   * — lets a learner avoid seeing every option's translation up front but
   * still get help understanding the correct one afterward. */
  translateCorrectAnswerEnabled: boolean;
  translateExplanationEnabled: boolean;
  /** The user's preferred non-German language (from Settings), shown as the
   * second explanation tab. The explanation panel always opens on Deutsch. */
  secondaryLanguage: ExplanationLanguage;
  /** Identifies this session in sessionStorage (e.g. "practice:<topic-slug>"
   * or "review") so progress survives navigating away (e.g. to Settings)
   * and back, instead of restarting from the first question. */
  storageKey: string;
  /** Notified on every answer/navigation change so a topic-scoped session
   * can mirror its live progress into the sidebar's question grid — omitted
   * for review mode, which mixes questions across topics. */
  onProgressChange?: (progress: PracticeSessionProgress) => void;
  /** Each question's most recent attempt, keyed by question id — permanent
   * history from the database. Seeds a brand-new session (no in-progress
   * sessionStorage) so previously-answered questions still show their real
   * outcome instead of resetting to blank every time the session restarts. */
  initialHistory?: Record<string, QuestionHistoryEntry>;
  /** Jump straight to this question index on mount — e.g. from the
   * sidebar's "Marked" widget, which links to a specific bookmarked
   * question. Takes priority over both a restored sessionStorage position
   * and the initialHistory "first unanswered" landing spot, since it's an
   * explicit navigation choice. */
  initialIndex?: number;
}

interface AnswerRecord {
  selectedOptionId: string | null;
  submitted: boolean;
  correctOptionId: string | null;
  isCorrect: boolean;
  revealed: boolean;
}

const EMPTY_ANSWER: AnswerRecord = {
  selectedOptionId: null,
  submitted: false,
  correctOptionId: null,
  isCorrect: false,
  revealed: false,
};

interface StoredProgress {
  index: number;
  answers: Record<number, AnswerRecord>;
}

export function PracticeSession({
  questions,
  mode,
  instantTranslationEnabled,
  translateQuestionEnabled,
  translateAnswersEnabled,
  translateCorrectAnswerEnabled,
  translateExplanationEnabled,
  secondaryLanguage,
  storageKey,
  onProgressChange,
  initialHistory,
  initialIndex,
}: PracticeSessionProps) {
  const router = useRouter();
  const dict = useUiDictionary();
  const [index, setIndex] = useState(0);
  // Keyed by question index — lets you jump back to an already-answered
  // question (via the number grid or Previous) and still see its result,
  // instead of only ever tracking the single "current" question's state.
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [pending, setPending] = useState(false);
  const [translationOn, setTranslationOn] = useState(instantTranslationEnabled);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [restored, setRestored] = useState(false);
  // Full-question natural translation, keyed by question id — a single
  // request per question (cached server-side after that), not per word.
  const [questionTranslations, setQuestionTranslations] = useState<Record<string, { translation: string; dir: "ltr" | "rtl" }>>({});
  const [failedTranslationIds, setFailedTranslationIds] = useState<Set<string>>(new Set());
  // Same idea, but one per answer option — kept in its own map (keyed by
  // option id) so each option's translation stays paired with that option's
  // own German text instead of being bundled into the question's paragraph.
  const [optionTranslations, setOptionTranslations] = useState<Record<string, { translation: string; dir: "ltr" | "rtl" }>>({});
  const [failedOptionTranslationIds, setFailedOptionTranslationIds] = useState<Set<string>>(new Set());

  const current = answers[index] ?? EMPTY_ANSWER;

  function updateCurrent(patch: Partial<AnswerRecord>) {
    setAnswers((prev) => ({ ...prev, [index]: { ...(prev[index] ?? EMPTY_ANSWER), ...patch } }));
  }

  /* eslint-disable react-hooks/set-state-in-effect --
     Restoring saved progress from sessionStorage (an external system) on
     mount is exactly the documented exception to "don't setState in an
     effect" — it can only run client-side, so doing it here (rather than
     in the initializer) is what avoids a server/client hydration mismatch.
     React 19 automatically batches these into a single re-render anyway. */
  useEffect(() => {
    let restoredFromStorage = false;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as StoredProgress;
        if (saved.index >= 0 && saved.index < questions.length) {
          setIndex(saved.index);
          setAnswers(saved.answers ?? {});
          restoredFromStorage = true;
        }
      }
    } catch {
      // Corrupt/inaccessible storage — just start fresh.
    }
    // No in-progress session found — fall back to the permanent database
    // history (if any) instead of showing every question as unanswered.
    if (!restoredFromStorage && initialHistory) {
      const seeded: Record<number, AnswerRecord> = {};
      questions.forEach((q, i) => {
        const entry = initialHistory[q.id];
        if (!entry) return;
        const correctOption = q.question_options.find((o) => o.is_correct);
        seeded[i] = {
          selectedOptionId: entry.selectedOptionId,
          submitted: true,
          correctOptionId: correctOption?.id ?? null,
          isCorrect: entry.isCorrect,
          revealed: false,
        };
      });
      if (Object.keys(seeded).length > 0) {
        setAnswers(seeded);
        // Land on the first not-yet-answered question rather than always
        // question 1 — that's the point of "continuing" past attempts.
        const firstUnansweredIndex = questions.findIndex((_, i) => !seeded[i]);
        if (firstUnansweredIndex >= 0) setIndex(firstUnansweredIndex);
      }
    }
    if (initialIndex != null && initialIndex >= 0 && initialIndex < questions.length) {
      setIndex(initialIndex);
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist progress on every relevant change, once the initial restore
  // pass has run (otherwise this would immediately overwrite the save with
  // the pre-restore default state).
  useEffect(() => {
    if (!restored) return;
    try {
      const progress: StoredProgress = { index, answers };
      sessionStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // Storage unavailable (private browsing, quota) — progress just won't persist.
    }
  }, [restored, storageKey, index, answers]);

  // Reset the per-question timer whenever the visible question changes
  // (navigating via Next/Previous/the number grid). Kept in an effect
  // rather than inline in the navigation handlers because those handlers
  // are reachable from a `.map()`-generated grid of buttons, where the
  // React Compiler's purity check can't prove a `Date.now()` call is
  // confined to a real event handler.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the timer to wall-clock time on question change is an intentional external-clock read, not a derivable render value.
    setStartedAt(Date.now());
  }, [index]);

  const question = questions[index];
  const isLast = index >= questions.length - 1;
  // How many questions have actually been answered (submitted), regardless
  // of correctness — not the current position in the list, so jumping
  // straight to the last question and answering it doesn't show 100%
  // while everything in between is still unanswered.
  const answeredCount = Object.values(answers).filter((a) => a.submitted).length;

  // Fetch the current question's full-sentence translation on demand (once
  // per question, cached thereafter both here and server-side) instead of
  // relying only on translating individual hovered words.
  useEffect(() => {
    if (!translationOn || !translateQuestionEnabled || !question) return;
    if (questionTranslations[question.id] || failedTranslationIds.has(question.id)) return;
    let cancelled = false;
    getQuestionTranslationAction(question.id).then((result) => {
      if (cancelled) return;
      if (result) {
        setQuestionTranslations((prev) => ({ ...prev, [question.id]: result }));
      } else {
        setFailedTranslationIds((prev) => new Set(prev).add(question.id));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [translationOn, translateQuestionEnabled, question, questionTranslations, failedTranslationIds]);

  // Same on-demand fetch, but per answer option — each option gets its own
  // translation request/cache entry so none of them get merged together.
  // Fetched whenever either "all answers" or "correct answer only" is
  // enabled, since the latter still needs this same cached data — it just
  // renders a subset of it, once the correct option is revealed.
  useEffect(() => {
    if (!translationOn || !question) return;
    if (!translateAnswersEnabled && !translateCorrectAnswerEnabled) return;
    let cancelled = false;
    for (const option of question.question_options) {
      if (optionTranslations[option.id] || failedOptionTranslationIds.has(option.id)) continue;
      getOptionTranslationAction(option.id).then((result) => {
        if (cancelled) return;
        if (result) {
          setOptionTranslations((prev) => ({ ...prev, [option.id]: result }));
        } else {
          setFailedOptionTranslationIds((prev) => new Set(prev).add(option.id));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [
    translationOn,
    translateAnswersEnabled,
    translateCorrectAnswerEnabled,
    question,
    optionTranslations,
    failedOptionTranslationIds,
  ]);

  const explanationsByLanguage = useMemo(() => {
    if (!question) return {};
    const map: Partial<Record<ExplanationLanguage, (typeof question.question_explanations)[number]>> = {};
    for (const exp of question.question_explanations) map[exp.language] = exp;
    return Object.fromEntries(
      Object.entries(map).map(([lang, exp]) => [
        lang,
        {
          summary: exp!.summary,
          whyCorrect: exp!.why_correct,
          whyIncorrect: exp!.why_incorrect,
          commonTrap: exp!.common_trap,
          testedConcept: exp!.tested_concept,
        },
      ])
    );
  }, [question]);

  async function submit(skipped = false) {
    if (!question || pending) return;
    setPending(true);
    const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);
    const result = await recordAttemptAction({
      questionId: question.id,
      selectedOptionId: skipped ? null : current.selectedOptionId,
      mode,
      skipped,
      guessed: false,
      timeTakenSeconds,
    });
    setPending(false);
    if ("error" in result) return;
    updateCurrent({ submitted: true, isCorrect: result.isCorrect, correctOptionId: result.correctOptionId });
  }

  const goToIndex = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= questions.length) return;
      setIndex(newIndex);
    },
    [questions.length]
  );

  // Mirror live progress up to a topic-scoped parent (which forwards it into
  // the sidebar's question grid) — not a re-fetch from the database, so the
  // grid reflects this session's answers the instant they're submitted.
  useEffect(() => {
    if (!onProgressChange) return;
    const statuses: SidebarQuestionStatus[] = questions.map((_, i) => {
      const record = answers[i];
      if (!record?.submitted || record.revealed) return "unanswered";
      return record.isCorrect ? "correct" : "incorrect";
    });
    onProgressChange({ questionIds: questions.map((q) => q.id), statuses, currentIndex: index, onSelect: goToIndex });
  }, [onProgressChange, questions, answers, index, goToIndex]);

  function next() {
    if (isLast) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore — nothing left to clean up if storage isn't available.
      }
      router.push("/dashboard");
      return;
    }
    goToIndex(index + 1);
  }

  function previous() {
    goToIndex(index - 1);
  }

  function showAnswer() {
    if (!question) return;
    const correct = question.question_options.find((o) => o.is_correct);
    updateCurrent({ correctOptionId: correct?.id ?? null, revealed: true, submitted: true });
  }

  function hideAnswer() {
    updateCurrent({ revealed: false, submitted: false, correctOptionId: null });
  }

  useKeyboardShortcuts(
    {
      "1": () => !current.submitted && question && updateCurrent({ selectedOptionId: question.question_options[0]?.id ?? null }),
      "2": () => !current.submitted && question && updateCurrent({ selectedOptionId: question.question_options[1]?.id ?? null }),
      "3": () => !current.submitted && question && updateCurrent({ selectedOptionId: question.question_options[2]?.id ?? null }),
      "4": () => !current.submitted && question && updateCurrent({ selectedOptionId: question.question_options[3]?.id ?? null }),
      enter: () => (current.submitted ? next() : void submit()),
      n: () => current.submitted && next(),
      t: () => setTranslationOn((v) => !v),
    },
    !!question
  );

  if (!question) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.practice.allDoneTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {mode === "review" ? dict.practice.noReviewsDue : dict.practice.noQuestionsToPractice}
          </p>
          <Button asChild className="self-start">
            <Link href="/dashboard">{dict.practice.backToDashboard}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatTemplate(dict.practice.questionProgress, { current: index + 1, total: questions.length })}
        </p>
        <div className="flex items-center gap-2">
          <MarkToggle key={question.id} questionId={question.id} initialMarked={question.marked} size="sm" />
          <ShortcutHelp />
        </div>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-base font-normal leading-relaxed text-foreground">
            {splitIntoSentences(question.question_text).map((sentence, i) => (
              <span key={i} className="block">
                <TranslatableText text={sentence} enabled={translationOn} />
              </span>
            ))}
          </p>

          {translationOn && translateQuestionEnabled && (
            <div className="rounded-md border border-accent bg-accent/40 px-3 py-2.5">
              {questionTranslations[question.id] ? (
                <p
                  dir={questionTranslations[question.id].dir}
                  className="text-sm leading-relaxed text-accent-foreground"
                >
                  {questionTranslations[question.id].translation}
                </p>
              ) : failedTranslationIds.has(question.id) ? (
                <p className="text-sm italic text-muted-foreground">{dict.common.noTranslationAvailable}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {dict.common.loading}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {question.question_options.map((option) => {
              const selected = current.selectedOptionId === option.id;
              const showAsCorrect = current.submitted && option.id === current.correctOptionId;
              const showAsWrongSelection = current.submitted && selected && option.id !== current.correctOptionId;

              return (
                <div
                  key={option.id}
                  role="button"
                  tabIndex={current.submitted ? -1 : 0}
                  aria-disabled={current.submitted}
                  aria-pressed={selected}
                  onClick={() => {
                    if (!current.submitted) updateCurrent({ selectedOptionId: option.id });
                  }}
                  onKeyDown={(e) => {
                    if (current.submitted) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      updateCurrent({ selectedOptionId: option.id });
                    }
                  }}
                  className={`flex items-start gap-[14px] rounded-md border-2 px-[18px] py-[14px] text-left text-[15px] leading-[1.5] transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    current.submitted ? "cursor-default" : "cursor-pointer"
                  } ${
                    showAsCorrect
                      ? "border-success bg-success/10"
                      : showAsWrongSelection
                        ? "border-destructive bg-destructive/10"
                        : selected
                          ? "border-primary bg-accent"
                          : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <span
                    className={`relative flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                      showAsCorrect
                        ? "border-success bg-success text-success-foreground"
                        : showAsWrongSelection
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.label}
                    {showAsWrongSelection && (
                      <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full border border-destructive bg-background text-destructive">
                        <XCircle className="size-3" />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-1 text-foreground">
                    <span>
                      <TranslatableText text={option.option_text} enabled={translationOn} />
                    </span>
                    {translationOn &&
                      (translateAnswersEnabled || (translateCorrectAnswerEnabled && showAsCorrect)) &&
                      (optionTranslations[option.id] ? (
                        <span
                          dir={optionTranslations[option.id].dir}
                          className="text-xs leading-relaxed text-muted-foreground"
                        >
                          {optionTranslations[option.id].translation}
                        </span>
                      ) : failedOptionTranslationIds.has(option.id) ? (
                        <span className="text-xs italic text-muted-foreground">{dict.common.noTranslationAvailable}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" />
                          {dict.common.loading}
                        </span>
                      ))}
                  </span>
                </div>
              );
            })}
          </div>

          {!current.submitted ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submit(false)} disabled={!current.selectedOptionId || pending}>
                {pending ? dict.practice.checking : dict.practice.confirm}
              </Button>
              <Button onClick={() => submit(true)} disabled={pending} variant="ghost">
                {dict.practice.skip}
              </Button>
              <Button onClick={showAnswer} disabled={pending} variant="outline" className="gap-1.5">
                <Eye className="size-4" />
                {dict.practice.showAnswer}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {current.revealed ? (
                <button
                  type="button"
                  onClick={hideAnswer}
                  className="group self-start rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Badge
                    variant="accent"
                    className="flex items-center gap-1.5 py-1 transition-colors group-hover:bg-destructive/15 group-hover:text-destructive"
                  >
                    <Eye className="size-3.5" />
                    {dict.practice.answerShown}
                    <X className="size-3.5" />
                  </Badge>
                </button>
              ) : (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                    current.isCorrect ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                        current.isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {current.isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    </span>
                    <span className={`text-sm font-semibold ${current.isCorrect ? "text-success" : "text-destructive"}`}>
                      {current.isCorrect ? dict.practice.correct : dict.practice.incorrect}
                    </span>
                  </div>
                  {!current.isCorrect && current.selectedOptionId && (
                    <span className="rounded-pill border border-destructive/30 bg-background px-3 py-1 text-xs font-medium text-destructive">
                      {formatTemplate(dict.practice.yourAnswer, {
                        label: question.question_options.find((o) => o.id === current.selectedOptionId)?.label ?? "",
                      })}
                    </span>
                  )}
                </div>
              )}

              {question.question_vocabulary.length > 0 && (
                <VocabularyPanel items={question.question_vocabulary} secondaryLanguage={secondaryLanguage} />
              )}

              {Object.keys(explanationsByLanguage).length > 0 && (
                <ExplanationView
                  explanations={explanationsByLanguage}
                  secondaryLanguage={secondaryLanguage}
                  correctLabel={question.question_options.find((o) => o.is_correct)?.label ?? ""}
                  translateExplanationEnabled={translateExplanationEnabled}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spacer so the fixed footer below never overlaps the last bit of
          real content — height matches the footer's own rendered height. */}
      <div className="h-20" aria-hidden="true" />

      {/* Persistent footer: Previous / progress bar / Next, always visible
          regardless of answered state (matching the reference design).
          Fixed to the viewport bottom, spanning only the main content area
          (offset past the 260px desktop sidebar — see SidebarNav — so it
          never extends under it), sitting above the mobile BottomNav
          (which is 4rem tall) on small screens. */}
      <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-border bg-background px-4 py-3 md:bottom-0 md:left-[260px] md:right-0">
        <Button variant="ghost" size="sm" onClick={() => previous()} disabled={index === 0} className="gap-1">
          <ChevronLeft className="size-4" />
          {dict.practice.previous}
        </Button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-muted">
          <div
            className="h-full rounded-pill bg-primary transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <Button size="sm" onClick={() => next()} disabled={!current.submitted} className="gap-1">
          {isLast ? dict.practice.finish : dict.practice.next}
          {!isLast && <ChevronRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
