"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SidebarQuestionStatus = "correct" | "incorrect" | "unanswered";

export interface PracticeSidebarTarget {
  topicId: string;
  /** Same order as the active practice session's question list — index i
   * here is index i in that session, so the grid and the session always
   * agree on numbering. */
  questionIds: string[];
  /** Live outcome per question, recomputed by the practice session on every
   * answer — not re-fetched from the database, so it reflects this session
   * immediately instead of whatever was last persisted. */
  statuses: SidebarQuestionStatus[];
  currentIndex: number;
  /** Jumps the live session to a given index; only meaningful while that
   * session is actually mounted (see PracticeQuestionGrid). */
  onSelect: (index: number) => void;
}

interface PracticeSidebarContextValue {
  active: PracticeSidebarTarget | null;
  setActive: (target: PracticeSidebarTarget) => void;
}

const PracticeSidebarContext = createContext<PracticeSidebarContextValue | null>(null);

/** Wraps the whole authenticated app so the question-number grid (set by a
 * practice topic page) keeps showing in the sidebar while browsing a
 * question's detail page too — both live under the same persistent (app)
 * layout, so this state survives client-side navigation between them.
 * Deliberately never auto-clears on unmount: visibility is instead decided
 * by the current route (see PracticeQuestionGrid), not by this lifecycle. */
export function PracticeSidebarProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<PracticeSidebarTarget | null>(null);
  return <PracticeSidebarContext.Provider value={{ active, setActive }}>{children}</PracticeSidebarContext.Provider>;
}

export function usePracticeSidebar() {
  const ctx = useContext(PracticeSidebarContext);
  if (!ctx) throw new Error("usePracticeSidebar must be used within a PracticeSidebarProvider");
  return ctx;
}
