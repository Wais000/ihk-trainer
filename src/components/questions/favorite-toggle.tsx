"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/lib/attempts/actions";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export function FavoriteToggle({ questionId, initialFavorite }: { questionId: string; initialFavorite: boolean }) {
  const dict = useUiDictionary();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !favorite;
    setFavorite(next);
    startTransition(() => {
      void toggleFavoriteAction(questionId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={favorite}
      aria-label={favorite ? dict.favorite.remove : dict.favorite.add}
      className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Star className={`size-5 ${favorite ? "fill-warning text-warning" : ""}`} />
    </button>
  );
}
