"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { resetAllProgressAction } from "@/app/(app)/settings/actions";

export interface ResetProgressSectionProps {
  /** The reset warning in English, always shown regardless of UI language. */
  warningEnglish: string;
  /** The same warning in the user's chosen translation language (Settings →
   * "Bevorzugte Sprache") — omitted when that language already IS English,
   * to avoid showing the identical text twice. */
  warningSecondary: string | null;
  secondaryDir: "ltr" | "rtl";
}

export function ResetProgressSection({ warningEnglish, warningSecondary, secondaryDir }: ResetProgressSectionProps) {
  const dict = useUiDictionary();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  function closeDialog(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setAcknowledged(false);
  }

  async function handleConfirm() {
    setResetting(true);
    const res = await resetAllProgressAction();
    setResetting(false);
    const success = !("error" in res);
    setResult(success ? "success" : "error");
    if (success) {
      // The database is now clean, but any practice/review session cached
      // in this tab's sessionStorage isn't — without clearing it, resuming
      // a category would still "restore" the pre-reset local snapshot
      // instead of reflecting the reset.
      try {
        sessionStorage.clear();
      } catch {
        // Storage unavailable — the reset itself still succeeded.
      }
      closeDialog(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          {dict.settings.dangerZoneTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button variant="destructive" onClick={() => setOpen(true)} className="self-start">
          {dict.settings.resetAllButton}
        </Button>
        {result === "success" && <p className="text-sm text-success">{dict.settings.resetAllSuccess}</p>}
        {result === "error" && <p className="text-sm text-destructive">{dict.settings.resetAllFailed}</p>}
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="w-[min(92vw,32rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {dict.settings.resetAllDialogTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 flex flex-col gap-3">
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              {warningEnglish}
            </p>
            {warningSecondary && (
              <p
                dir={secondaryDir}
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
              >
                {warningSecondary}
              </p>
            )}
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4 shrink-0"
            />
            {dict.settings.resetAllConfirmCheckbox}
          </label>

          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={resetting}>
              {dict.settings.cancel}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!acknowledged || resetting}>
              {resetting ? dict.settings.resetting : dict.settings.resetAllConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
