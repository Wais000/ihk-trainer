"use client";

import { useActionState } from "react";
import { startExamAction } from "@/app/(app)/exam/actions";
import { Button } from "@/components/ui/button";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

interface StartExamState {
  error: string | null;
}

async function action(): Promise<StartExamState> {
  const result = await startExamAction();
  return { error: result?.error ?? null };
}

export function StartExamButton() {
  const dict = useUiDictionary();
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? dict.exam.starting : dict.exam.startExam}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
