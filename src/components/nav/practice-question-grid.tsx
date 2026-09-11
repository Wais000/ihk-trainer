"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePracticeSidebar } from "@/components/practice/practice-sidebar-context";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

// 6 columns of size-7 (28px) cells + gap-1.5 (6px) is the most that fits the
// 260px sidebar's inner width without wrapping or overflowing (the "6" below
// in `grid-cols-6` must stay a literal class for Tailwind's scanner to pick
// it up — it can't be built from this constant); 5 rows of that keeps the
// box a reasonable height, hence 30 per page.
const PAGE_SIZE = 30;

/** Shown at the bottom of the sidebar whenever a practice topic is active
 * (see PracticeSidebarProvider) and the current route is part of that
 * practice flow — a compact, paginated (30 at a time) map of every question
 * in the category, colored by this session's live outcome for it. While the
 * interactive session itself is on screen (/practice/*), clicking a number
 * jumps within it; while browsing a question's detail page (/questions/*,
 * where the session isn't mounted to jump within), it navigates there
 * instead. */
export function PracticeQuestionGrid() {
  const { active } = usePracticeSidebar();
  const pathname = usePathname();
  const dict = useUiDictionary();
  const [page, setPage] = useState(0);

  const inSession = pathname.startsWith("/practice");
  const visible = active != null && (inSession || pathname.startsWith("/questions"));

  // Reset to the first page whenever a different topic becomes active — the
  // React-recommended way to adjust state during render in response to a
  // prop change, rather than in an effect (avoids an extra render pass).
  const [pageResetForTopic, setPageResetForTopic] = useState(active?.topicId ?? null);
  if ((active?.topicId ?? null) !== pageResetForTopic) {
    setPageResetForTopic(active?.topicId ?? null);
    setPage(0);
  }

  if (!visible || !active) return null;

  const totalCount = active.questionIds.length;
  const from = page * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, totalCount);
  const hasMore = to < totalCount;
  const pageIds = active.questionIds.slice(from, to);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label={dict.practice.previous}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">{totalCount > 0 ? `${from + 1}-${to}` : ""}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          aria-label={dict.practice.next}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {pageIds.map((id, i) => {
          const globalIndex = from + i;
          const status = active.statuses[globalIndex] ?? "unanswered";
          const num = globalIndex + 1;
          const isCurrent = globalIndex === active.currentIndex;
          const className = `flex size-7 items-center justify-center rounded-md border bg-card text-xs font-medium transition-colors hover:bg-accent/50 ${
            isCurrent ? "border-2 border-primary" : ""
          } ${
            status === "correct"
              ? "border-success text-success"
              : status === "incorrect"
                ? "border-destructive text-destructive"
                : "border-border text-foreground"
          }`;

          return inSession ? (
            <button key={id} type="button" onClick={() => active.onSelect(globalIndex)} className={className}>
              {num}
            </button>
          ) : (
            <Link key={id} href={`/questions/${id}`} className={className}>
              {num}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
