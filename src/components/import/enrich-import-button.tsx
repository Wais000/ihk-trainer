"use client";

import { useState, useTransition } from "react";
import { enrichImportAction } from "@/app/(app)/questions/import/actions";
import { Button } from "@/components/ui/button";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";

export function EnrichImportButton({ importId, disabled }: { importId: string; disabled?: boolean }) {
  const dict = useUiDictionary();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const summary = await enrichImportAction(importId);
      setResult({ succeeded: summary.succeeded, failed: summary.failed });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending || disabled} variant="secondary">
        {pending ? dict.importFlow.generatingExplanations : dict.importFlow.generateExplanationsCta}
      </Button>
      {result && (
        <p className="text-sm text-muted-foreground">
          {formatTemplate(dict.importFlow.enrichResultSummary, { succeeded: result.succeeded, failed: result.failed })}
        </p>
      )}
    </div>
  );
}
