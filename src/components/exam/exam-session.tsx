"use client";

import { useEffect, useState } from "react";
import { submitExamAnswerAction, finishExamAction } from "@/app/(app)/exam/actions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, LayoutGrid } from "lucide-react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";

export interface ExamOption {
  id: string;
  label: string;
  option_text: string;
}

export interface ExamAnswerItem {
  examAnswerId: string;
  questionId: string;
  questionText: string;
  options: ExamOption[];
  selectedOptionId: string | null;
  markedForReview: boolean;
}

export function ExamSession({
  sessionId,
  items,
  startedAtIso,
  durationSeconds,
}: {
  sessionId: string;
  items: ExamAnswerItem[];
  startedAtIso: string;
  durationSeconds: number;
}) {
  const dict = useUiDictionary();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(items);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  });
  const [finishing, setFinishing] = useState(false);
  const [showOverview, setShowOverview] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !finishing) {
      handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const current = answers[index];
  const startedAt = useState(() => Date.now())[0];

  function updateAnswer(examAnswerId: string, patch: Partial<ExamAnswerItem>) {
    setAnswers((prev) => prev.map((a) => (a.examAnswerId === examAnswerId ? { ...a, ...patch } : a)));
    const updated = { ...answers.find((a) => a.examAnswerId === examAnswerId)!, ...patch };
    void submitExamAnswerAction({
      examAnswerId,
      selectedOptionId: updated.selectedOptionId,
      markedForReview: updated.markedForReview,
      timeTakenSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  }

  function goTo(newIndex: number) {
    setIndex(Math.max(0, Math.min(answers.length - 1, newIndex)));
  }

  function handleFinish() {
    if (finishing) return;
    if (secondsLeft > 0 && !window.confirm(dict.exam.confirmEndExam)) {
      return;
    }
    setFinishing(true);
    void finishExamAction(sessionId);
  }

  useKeyboardShortcuts(
    {
      "1": () => current && updateAnswer(current.examAnswerId, { selectedOptionId: current.options[0]?.id ?? null }),
      "2": () => current && updateAnswer(current.examAnswerId, { selectedOptionId: current.options[1]?.id ?? null }),
      "3": () => current && updateAnswer(current.examAnswerId, { selectedOptionId: current.options[2]?.id ?? null }),
      "4": () => current && updateAnswer(current.examAnswerId, { selectedOptionId: current.options[3]?.id ?? null }),
      n: () => goTo(index + 1),
      p: () => goTo(index - 1),
      r: () => current && updateAnswer(current.examAnswerId, { markedForReview: !current.markedForReview }),
    },
    !!current
  );

  if (!current) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const answeredCount = answers.filter((a) => a.selectedOptionId).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <p>
          {formatTemplate(dict.exam.questionProgress, {
            current: index + 1,
            total: answers.length,
            answered: answeredCount,
          })}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOverview((v) => !v)}
            aria-pressed={showOverview}
            aria-label={dict.exam.overviewTitle}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
              showOverview ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <LayoutGrid className="size-4" />
            {dict.exam.overview}
          </button>
          <p className={`font-mono font-medium ${secondsLeft < 300 ? "text-destructive" : ""}`} role="timer">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
        </div>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={answers.length}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${answers.length > 0 ? (answeredCount / answers.length) * 100 : 0}%` }}
        />
      </div>

      {showOverview && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {answers.map((a, i) => {
                const isCurrent = i === index;
                const isAnswered = !!a.selectedOptionId;
                return (
                  <button
                    key={a.examAnswerId}
                    type="button"
                    onClick={() => {
                      goTo(i);
                      setShowOverview(false);
                    }}
                    aria-label={formatTemplate(dict.exam.questionNumberLabel, { number: i + 1 })}
                    aria-current={isCurrent}
                    className={`relative flex size-9 items-center justify-center rounded-md border text-xs font-medium transition-colors hover:bg-accent/50 ${
                      isCurrent ? "border-2 border-primary" : "border-border"
                    } ${isAnswered ? "bg-accent text-accent-foreground" : "bg-card text-foreground"}`}
                  >
                    {i + 1}
                    {a.markedForReview && (
                      <Flag className="absolute -right-1 -top-1 size-3 fill-warning text-warning" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-accent" /> {dict.exam.answeredLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border border-border bg-card" /> {dict.exam.unansweredLegend}
              </span>
              <span className="flex items-center gap-1.5">
                <Flag className="size-3 fill-warning text-warning" /> {dict.exam.markedForReviewLegend}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="text-lg font-normal leading-relaxed">{current.questionText}</CardTitle>
          <button
            type="button"
            onClick={() => updateAnswer(current.examAnswerId, { markedForReview: !current.markedForReview })}
            aria-pressed={current.markedForReview}
            aria-label={dict.exam.markForReview}
            className={`shrink-0 rounded-md p-2 ${current.markedForReview ? "text-warning" : "text-muted-foreground"} hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <Flag className="size-5" fill={current.markedForReview ? "currentColor" : "none"} />
          </button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {current.options.map((option, i) => {
            const selected = current.selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateAnswer(current.examAnswerId, { selectedOptionId: option.id })}
                aria-pressed={selected}
                className={`flex items-start gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                  {i + 1}
                </span>
                <span>{option.option_text}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button onClick={() => goTo(index - 1)} disabled={index === 0} variant="outline">
            {dict.exam.back}
          </Button>
          <Button onClick={() => goTo(index + 1)} disabled={index === answers.length - 1} variant="outline">
            {dict.exam.next}
          </Button>
        </div>
        <Button onClick={handleFinish} disabled={finishing} variant="destructive">
          {dict.exam.endExam}
        </Button>
      </div>
    </div>
  );
}
