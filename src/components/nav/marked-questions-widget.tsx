"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { useMarkedQuestions } from "@/components/practice/marked-questions-context";
import { usePracticeSidebar } from "@/components/practice/practice-sidebar-context";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

// Same 6-column, 30-per-page layout as PracticeQuestionGrid, for the same
// reason (fits the 260px sidebar without wrapping or overflowing).
const PAGE_SIZE = 30;

/** Always-visible "your marked questions" panel — unlike PracticeQuestionGrid
 * (which only shows once a practice session is actually mounted), this one
 * is visible everywhere in the app so a bookmarked question is never more
 * than a sidebar click away. Cells are deliberately left neutral (not
 * colored by past correct/incorrect outcomes, unlike the live session grid)
 * — this is a bookmark list, not a scoreboard, and every entry should read
 * as "still to revisit" regardless of history. Clicking one jumps straight
 * into that question inside the /practice/marked session.
 *
 * Suppressed while PracticeQuestionGrid is already showing this exact same
 * list (i.e. the marked session is the live one) — otherwise the sidebar
 * would show two overlapping grids of the same questions at once. */
export function MarkedQuestionsWidget() {
  const { markedIds } = useMarkedQuestions();
  const { active } = usePracticeSidebar();
  const pathname = usePathname();
  const dict = useUiDictionary();
  const [page, setPage] = useState(0);

  if (markedIds.length === 0) return null;

  const inSession = pathname.startsWith("/practice");
  const otherGridShowsThisList = active?.topicId === "marked" && (inSession || pathname.startsWith("/questions"));
  if (otherGridShowsThisList) return null;

  const from = page * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, markedIds.length);
  const hasMore = to < markedIds.length;
  const pageIds = markedIds.slice(from, to);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Bookmark className="size-3.5 fill-primary text-primary" />
        {dict.questions.filterMarked} ({markedIds.length})
      </span>
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
        <span className="text-xs font-medium text-muted-foreground">{`${from + 1}-${to}`}</span>
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
        {pageIds.map((id, i) => (
          <Link
            key={id}
            href={`/practice/marked?start=${id}`}
            className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            {from + i + 1}
          </Link>
        ))}
      </div>
    </div>
  );
}
