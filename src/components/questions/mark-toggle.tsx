"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleMarkedAction } from "@/lib/attempts/actions";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export interface MarkToggleProps {
  questionId: string;
  initialMarked: boolean;
  /** Practice session buttons sit on a compact row — smaller footprint than
   * the question detail page's toolbar icon. */
  size?: "default" | "sm";
}

export function MarkToggle({ questionId, initialMarked, size = "default" }: MarkToggleProps) {
  const dict = useUiDictionary();
  const [marked, setMarked] = useState(initialMarked);
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !marked;
    setMarked(next);
    startTransition(() => {
      void toggleMarkedAction(questionId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={marked}
      aria-label={marked ? dict.mark.remove : dict.mark.add}
      className={`flex items-center gap-1.5 rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        size === "sm" ? "p-1.5 text-xs" : "p-2 text-sm"
      } ${marked ? "text-primary" : ""}`}
    >
      <Bookmark className={size === "sm" ? "size-4" : "size-5"} fill={marked ? "currentColor" : "none"} />
      {size === "sm" && (marked ? dict.mark.remove : dict.mark.add)}
    </button>
  );
}
