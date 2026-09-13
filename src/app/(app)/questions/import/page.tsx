"use client";

import { useActionState } from "react";
import { createImportAction, type ImportActionState } from "@/app/(app)/questions/import/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

const initialState: ImportActionState = { error: null };

export default function ImportPage() {
  const [state, formAction, pending] = useActionState(createImportAction, initialState);
  const dict = useUiDictionary();

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dict.importFlow.title}</CardTitle>
          <CardDescription>{dict.importFlow.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <label htmlFor="rawText" className="sr-only">
              {dict.importFlow.textareaLabel}
            </label>
            <textarea
              id="rawText"
              name="rawText"
              required
              rows={16}
              placeholder={dict.importFlow.placeholder}
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? dict.importFlow.processing : dict.importFlow.detectQuestions}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
