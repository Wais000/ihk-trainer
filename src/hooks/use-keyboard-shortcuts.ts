"use client";

import { useEffect, useRef } from "react";

export type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/**
 * Registers optional single-key shortcuts (per the project's keyboard-first
 * UX goal). Shortcuts are always optional — never required to use the app —
 * and are suspended automatically while the user is typing in a field.
 */
export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  const mapRef = useRef(map);

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (!enabled) return;

    function handler(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const fn = mapRef.current[event.key.toLowerCase()];
      if (fn) fn(event);
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);
}
