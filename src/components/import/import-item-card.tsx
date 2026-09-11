"use client";

import { useState, useTransition } from "react";
import { saveImportItemAction } from "@/app/(app)/questions/import/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedQuestion } from "@/lib/validation/question";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import type { UiDictionary } from "@/lib/i18n/ui/en";

export interface ImportItemCardProps {
  id: string;
  status: string;
  parsed: ParsedQuestion;
  duplicateOf?: string | null;
}

function getStatusLabels(
  dict: UiDictionary
): Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> {
  return {
    pending: { label: dict.importFlow.pending, variant: "outline" },
    parsed: { label: dict.importFlow.ready, variant: "default" },
    needs_review: { label: dict.importFlow.checkAnswer, variant: "warning" },
    duplicate: { label: dict.importFlow.possibleDuplicate, variant: "warning" },
    saved: { label: dict.importFlow.saved, variant: "success" },
    failed: { label: dict.importFlow.failed, variant: "destructive" },
  };
}

export function ImportItemCard({ id, status, parsed }: ImportItemCardProps) {
  const dict = useUiDictionary();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    parsed.options.find((o) => o.isCorrect)?.label ?? null
  );
  const [localStatus, setLocalStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAnswerChoice = localStatus === "needs_review" && !selectedLabel;
  const statusLabels = getStatusLabels(dict);
  const statusInfo = statusLabels[localStatus] ?? statusLabels.pending;

  function handleSave() {
    if (!selectedLabel) {
      setError(dict.importFlow.selectCorrectAnswerFirst);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveImportItemAction(id, selectedLabel);
      if (result?.error) {
        setError(result.error);
      } else {
        setLocalStatus("saved");
      }
    });
  }

  const isSaved = localStatus === "saved";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="text-base font-normal leading-relaxed">{parsed.questionText}</CardTitle>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {parsed.options.map((option) => {
            const isSelected = selectedLabel === option.label;
            return (
              <button
                key={option.label}
                type="button"
                disabled={isSaved}
                onClick={() => setSelectedLabel(option.label)}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <span className="font-medium">{option.label}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>

        {parsed.sourceExplanation && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {dict.importFlow.sourceExplanationLabel}
            {parsed.sourceExplanation}
          </p>
        )}

        {needsAnswerChoice && (
          <p className="text-sm text-warning">{dict.importFlow.correctAnswerNotDetected}</p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {!isSaved && (
          <Button onClick={handleSave} disabled={pending || !selectedLabel} className="self-start">
            {pending ? dict.importFlow.saving : dict.importFlow.save}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
