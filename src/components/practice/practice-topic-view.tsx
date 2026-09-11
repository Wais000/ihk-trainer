"use client";

import { useCallback, useEffect, useState } from "react";
import { PracticeSession, type PracticeSessionProgress, type PracticeSessionProps } from "@/components/practice/practice-session";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { usePracticeSidebar } from "@/components/practice/practice-sidebar-context";
import { resetTopicHistoryAction } from "@/app/(app)/practice/actions";

export interface PracticeTopicViewProps extends Omit<PracticeSessionProps, "mode" | "onProgressChange"> {
  topicId: string;
}

export function PracticeTopicView({ topicId, ...sessionProps }: PracticeTopicViewProps) {
  const dict = useUiDictionary();
  const { setActive } = usePracticeSidebar();
  // Bumped when starting fresh to force PracticeSession to remount with
  // fully blank state, rather than trying to reset its internal state from
  // the outside.
  const [sessionVersion, setSessionVersion] = useState(0);
  const [historyOverride, setHistoryOverride] = useState<PracticeSessionProps["initialHistory"] | null>(null);
  const [resetting, setResetting] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const handleProgressChange = useCallback(
    (progress: PracticeSessionProgress) => setActive({ topicId, ...progress }),
    [topicId, setActive]
  );

  // Ask "continue or start fresh?" only when there's a real choice to make:
  // no in-progress session in this browser tab (a genuinely new visit to
  // this category), but past attempts already recorded for it.
  useEffect(() => {
    const hasPriorHistory = Object.keys(sessionProps.initialHistory ?? {}).length > 0;
    if (!hasPriorHistory) return;
    let hasInProgressSession = false;
    try {
      hasInProgressSession = sessionStorage.getItem(sessionProps.storageKey) != null;
    } catch {
      // Storage unavailable — treat as no in-progress session.
    }
    if (!hasInProgressSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deciding whether to prompt depends on sessionStorage (an external system) that only exists client-side.
      setShowResumeDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  async function handleStartFresh() {
    setResetting(true);
    await resetTopicHistoryAction(topicId);
    try {
      sessionStorage.removeItem(sessionProps.storageKey);
    } catch {
      // Storage unavailable — the version bump below still forces a fresh session.
    }
    setHistoryOverride({});
    setSessionVersion((v) => v + 1);
    setResetting(false);
    setShowResumeDialog(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.practice.resumeDialogTitle}</DialogTitle>
            <DialogDescription>{dict.practice.resumeDialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleStartFresh} disabled={resetting}>
              {dict.practice.startFresh}
            </Button>
            <Button onClick={() => setShowResumeDialog(false)}>{dict.practice.continueSession}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PracticeSession
        key={sessionVersion}
        mode="practice"
        onProgressChange={handleProgressChange}
        {...sessionProps}
        initialHistory={historyOverride ?? sessionProps.initialHistory}
      />
    </div>
  );
}
