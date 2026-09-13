"use client";

import { useState } from "react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import { Button } from "@/components/ui/button";
import { computeNextReview, INTERVAL_BY_STREAK_DAYS, type ReviewState } from "@/lib/srs/schedule";

const INITIAL_STATE: ReviewState = { consecutive_correct: 0, consecutive_wrong: 0 };
const MAX_INTERVAL_DAYS = INTERVAL_BY_STREAK_DAYS[INTERVAL_BY_STREAK_DAYS.length - 1];

export function ReviewLadderDemo() {
  const dict = useUiDictionary().landing;
  const [state, setState] = useState<ReviewState>(INITIAL_STATE);
  const [hoursUntil, setHoursUntil] = useState<number | null>(null);
  const [intervalDays, setIntervalDays] = useState<number | null>(null);

  function answer(wasCorrect: boolean) {
    const now = new Date();
    const result = computeNextReview(state, wasCorrect, now);
    setState({ consecutive_correct: result.consecutive_correct, consecutive_wrong: result.consecutive_wrong });
    setIntervalDays(result.review_interval_days);
    if (!wasCorrect) {
      setHoursUntil(Math.round((new Date(result.next_review_at).getTime() - now.getTime()) / (60 * 60 * 1000)));
    } else {
      setHoursUntil(null);
    }
  }

  function reset() {
    setState(INITIAL_STATE);
    setHoursUntil(null);
    setIntervalDays(null);
  }

  const untouched = state.consecutive_correct === 0 && state.consecutive_wrong === 0;
  const onWrongPath = state.consecutive_wrong > 0;
  const atTop = state.consecutive_correct > 0 && intervalDays === MAX_INTERVAL_DAYS;

  let headline: string;
  let detail: string;
  if (untouched) {
    headline = dict.reviewLadderStateUntouchedHeadline;
    detail = dict.reviewLadderStateUntouchedDetail;
  } else if (onWrongPath) {
    if (state.consecutive_wrong === 1) {
      headline = dict.reviewLadderStateWrong1Headline;
      detail = dict.reviewLadderStateWrong1Detail;
    } else {
      headline = formatTemplate(dict.reviewLadderStateWrongNHeadline, { hours: `${hoursUntil ?? 1}h` });
      detail = formatTemplate(dict.reviewLadderStateWrongNDetail, { count: state.consecutive_wrong });
    }
  } else if (atTop) {
    headline = dict.reviewLadderStateTopHeadline;
    detail = dict.reviewLadderStateTopDetail;
  } else {
    headline = formatTemplate(dict.reviewLadderStateStreakNHeadline, { days: intervalDays ?? 0 });
    detail = formatTemplate(dict.reviewLadderStateStreakNDetail, { count: state.consecutive_correct });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {dict.reviewLadderKicker}
      </p>
      <div role="status" aria-live="polite">
        <p className="text-xl font-semibold">{headline}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="success" onClick={() => answer(true)}>
          {dict.reviewGotItRight}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => answer(false)}>
          {dict.reviewGotItWrong}
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          {dict.reviewReset}
        </Button>
      </div>
    </div>
  );
}
