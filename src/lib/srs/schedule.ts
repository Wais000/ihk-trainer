/**
 * Simple spaced-repetition schedule, deliberately basic and easy to
 * explain to a learner (per the project spec — not SM-2 or anything
 * opaque). Kept as a pure function so the algorithm can be swapped out
 * later without touching call sites.
 */

export const INTERVAL_BY_STREAK_DAYS = [0, 1, 3, 7, 14]; // index = consecutive_correct (capped)
const WRONG_REVIEW_HOURS = 4; // "review soon" after a wrong answer

export interface ReviewState {
  consecutive_correct: number;
  consecutive_wrong: number;
}

export interface NextReview {
  next_review_at: string; // ISO timestamp
  review_interval_days: number;
  consecutive_correct: number;
  consecutive_wrong: number;
}

export function computeNextReview(current: ReviewState, wasCorrect: boolean, now: Date = new Date()): NextReview {
  if (!wasCorrect) {
    const consecutiveWrong = current.consecutive_wrong + 1;
    // Repeated mistakes review even sooner — halve the wait each additional miss, floor at 1 hour.
    const hours = Math.max(1, WRONG_REVIEW_HOURS / Math.pow(2, consecutiveWrong - 1));
    const nextReviewAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return {
      next_review_at: nextReviewAt.toISOString(),
      review_interval_days: 0,
      consecutive_correct: 0,
      consecutive_wrong: consecutiveWrong,
    };
  }

  const consecutiveCorrect = current.consecutive_correct + 1;
  const intervalIndex = Math.min(consecutiveCorrect, INTERVAL_BY_STREAK_DAYS.length - 1);
  const intervalDays = INTERVAL_BY_STREAK_DAYS[intervalIndex];
  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    next_review_at: nextReviewAt.toISOString(),
    review_interval_days: intervalDays,
    consecutive_correct: consecutiveCorrect,
    consecutive_wrong: 0,
  };
}
