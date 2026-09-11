"use client";

import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const dict = useUiDictionary();

  const shortcuts: [string, string][] = [
    ["1–4", dict.shortcuts.selectAnswer],
    ["Enter", dict.shortcuts.confirm],
    ["N", dict.shortcuts.nextQuestion],
    ["T", dict.shortcuts.toggleTranslation],
    ["Esc", dict.shortcuts.closePopup],
  ];

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={dict.shortcuts.showLabel}
        className="gap-1.5 text-muted-foreground"
      >
        <Keyboard className="size-4" />
        {dict.shortcuts.title}
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium">{dict.shortcuts.title}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={dict.shortcuts.close}
          className="rounded-sm p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-1 text-muted-foreground">
        {shortcuts.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-foreground">{key}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
