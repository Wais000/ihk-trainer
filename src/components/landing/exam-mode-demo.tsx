"use client";

import { useEffect, useState } from "react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EXAM_DURATION_SECONDS, EXAM_QUESTION_COUNT } from "@/lib/exam/constants";
import { EXAM_DEMO_QUESTION, WEAKEST_TOPIC_LABEL, type DemoOptionLabel } from "@/lib/landing/demo-content";

type Phase = "idle" | "running" | "done";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExamModeDemo() {
  const dict = useUiDictionary().landing;
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(EXAM_DURATION_SECONDS);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, DemoOptionLabel>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  function start() {
    setPhase("running");
    setRemaining(EXAM_DURATION_SECONDS);
    setCurrent(0);
    setAnswers({});
    setMarked(new Set());
  }

  function selectOption(label: DemoOptionLabel) {
    setAnswers((prev) => ({ ...prev, [current]: label }));
  }

  function toggleMark() {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  }

  function endExam() {
    setPhase("done");
  }

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a === EXAM_DEMO_QUESTION.correctLabel).length;
  const incorrectCount = answeredCount - correctCount;
  const skippedCount = EXAM_QUESTION_COUNT - answeredCount;
  const elapsed = EXAM_DURATION_SECONDS - remaining;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      {phase === "idle" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-medium text-muted-foreground">{dict.examStatusIdle}</p>
          <Button onClick={start}>{dict.examStartCta}</Button>
        </div>
      )}

      {phase === "running" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-sm font-medium">
              {formatTemplate(dict.examStatusRunning, {
                current: current + 1,
                total: EXAM_QUESTION_COUNT,
                answered: answeredCount,
              })}
            </p>
            <span className="rounded-pill bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground" aria-label="timer">
              {formatDuration(remaining)}
            </span>
          </div>

          <div className="grid grid-cols-10 gap-1" role="group" aria-label="question navigator">
            {Array.from({ length: EXAM_QUESTION_COUNT }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                aria-current={i === current ? "true" : undefined}
                aria-label={`Frage ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={cn(
                  "flex h-7 items-center justify-center rounded-sm border text-xs font-medium transition-colors",
                  i === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : answers[i]
                      ? "border-success/50 bg-success/15 text-success"
                      : marked.has(i)
                        ? "border-warning/50 bg-warning/15 text-warning"
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <p lang="de" className="text-base leading-relaxed">
            {EXAM_DEMO_QUESTION.text}
          </p>
          <div role="radiogroup" aria-label={EXAM_DEMO_QUESTION.text} className="flex flex-col gap-2">
            {EXAM_DEMO_QUESTION.options.map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={answers[current] === option.label}
                onClick={() => selectOption(option.label)}
                className={cn(
                  "flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  answers[current] === option.label
                    ? "border-primary bg-accent"
                    : "border-border bg-transparent hover:bg-accent/50"
                )}
              >
                <span className="font-semibold">{option.label}</span>
                <span lang="de">{option.text}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{dict.examNoFeedbackNote}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleMark}>
                {marked.has(current) ? dict.examRemoveMark : dict.examMarkForReview}
              </Button>
              <Button variant="destructive" size="sm" onClick={endExam}>
                {dict.examEndExam}
              </Button>
            </div>
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {dict.examStatusDone}
          </p>
          {answeredCount === 0 ? (
            <p className="text-lg font-semibold">
              {formatTemplate(dict.examSkippedAll, { duration: formatDuration(elapsed) })}
            </p>
          ) : (
            <>
              <p className="text-2xl font-semibold">
                {formatTemplate(dict.examScoreLine, { correct: correctCount, answered: answeredCount })}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatTemplate(dict.examBreakdown, {
                  correct: correctCount,
                  incorrect: incorrectCount,
                  skipped: skippedCount,
                  duration: formatDuration(elapsed),
                  topic: WEAKEST_TOPIC_LABEL,
                })}
              </p>
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={start}>
              {dict.examRunAgain}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPhase("idle")}>
              {dict.examBack}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
