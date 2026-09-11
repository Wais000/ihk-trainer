"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { flagQuestionAction } from "@/lib/questions/actions";
import { Button } from "@/components/ui/button";
import type { FlagType } from "@/lib/types/database";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

const FLAG_TYPES: { value: FlagType; label: string }[] = [
  { value: "wrong_answer", label: "Antwort falsch" },
  { value: "bad_explanation", label: "Erklärung schlecht" },
  { value: "bad_translation", label: "Übersetzung schlecht" },
  { value: "duplicate", label: "Duplikat" },
  { value: "other", label: "Anderes" },
];

export function FlagQuestionForm({ questionId }: { questionId: string }) {
  const dict = useUiDictionary();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [type, setType] = useState<FlagType | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return <p className="text-sm text-muted-foreground">{dict.flag.thanks}</p>;
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-muted-foreground">
        <Flag className="size-4" />
        {dict.flag.reportProblem}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Was stimmt nicht?</p>
      <div className="flex flex-wrap gap-1.5">
        {FLAG_TYPES.map((t) => (
          <Button
            key={t.value}
            type="button"
            variant={type === t.value ? "accent" : "outline"}
            size="pill"
            onClick={() => setType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <Button
        size="sm"
        disabled={!type || pending}
        onClick={() =>
          startTransition(async () => {
            if (!type) return;
            await flagQuestionAction(questionId, type, null);
            setSent(true);
          })
        }
        className="self-start"
      >
        {dict.flag.submit}
      </Button>
    </div>
  );
}
