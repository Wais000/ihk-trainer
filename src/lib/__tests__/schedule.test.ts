import { describe, it, expect } from "vitest";
import { computeNextReview } from "@/lib/srs/schedule";

describe("computeNextReview", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("schedules a soon review after a wrong answer and resets the correct streak", () => {
    const result = computeNextReview({ consecutive_correct: 3, consecutive_wrong: 0 }, false, now);
    expect(result.consecutive_correct).toBe(0);
    expect(result.consecutive_wrong).toBe(1);
    expect(new Date(result.next_review_at).getTime()).toBeGreaterThan(now.getTime());
    expect(new Date(result.next_review_at).getTime()).toBeLessThan(now.getTime() + 24 * 60 * 60 * 1000);
  });

  it("reviews repeated mistakes even sooner than a single mistake", () => {
    const once = computeNextReview({ consecutive_correct: 0, consecutive_wrong: 0 }, false, now);
    const twice = computeNextReview({ consecutive_correct: 0, consecutive_wrong: 1 }, false, now);
    expect(new Date(twice.next_review_at).getTime()).toBeLessThanOrEqual(new Date(once.next_review_at).getTime());
  });

  it("follows the 1/3/7/14 day progression for consecutive correct answers", () => {
    let state = { consecutive_correct: 0, consecutive_wrong: 0 };
    const expectedDays = [1, 3, 7, 14, 14]; // caps at 14

    for (const expectedDay of expectedDays) {
      const result = computeNextReview(state, true, now);
      expect(result.review_interval_days).toBe(expectedDay);
      state = { consecutive_correct: result.consecutive_correct, consecutive_wrong: result.consecutive_wrong };
    }
  });

  it("resets the wrong streak on a correct answer", () => {
    const result = computeNextReview({ consecutive_correct: 0, consecutive_wrong: 3 }, true, now);
    expect(result.consecutive_wrong).toBe(0);
    expect(result.consecutive_correct).toBe(1);
  });
});
