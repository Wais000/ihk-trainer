"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getMarkedQuestionIdsAction } from "@/lib/questions/actions";

interface MarkedQuestionsContextValue {
  /** Oldest-imported first — same order /practice/marked practices them in. */
  markedIds: string[];
  /** Re-fetches from the database. MarkToggle calls this right after a
   * successful bookmark/unbookmark so the sidebar's count and grid update
   * immediately, without waiting for the next navigation. */
  refresh: () => void;
}

const MarkedQuestionsContext = createContext<MarkedQuestionsContextValue | null>(null);

/** Wraps the whole authenticated app (see AppLayout) so the sidebar's
 * "Marked" widget always reflects the current bookmark list, independent of
 * whether a practice session happens to be mounted right now. */
export function MarkedQuestionsProvider({ children }: { children: ReactNode }) {
  const [markedIds, setMarkedIds] = useState<string[]>([]);

  const refresh = useCallback(() => {
    void getMarkedQuestionIdsAction().then(setMarkedIds);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MarkedQuestionsContext.Provider value={{ markedIds, refresh }}>{children}</MarkedQuestionsContext.Provider>
  );
}

export function useMarkedQuestions(): MarkedQuestionsContextValue {
  const ctx = useContext(MarkedQuestionsContext);
  if (!ctx) throw new Error("useMarkedQuestions must be used within a MarkedQuestionsProvider");
  return ctx;
}
