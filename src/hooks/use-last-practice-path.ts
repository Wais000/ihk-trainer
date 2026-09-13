"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "practice:lastPath";

/** Remembers the last /practice/* URL visited (a specific topic session,
 * not just the topic list) so the sidebar/bottom-nav "Practice" link can
 * return the learner to where they were — e.g. after a detour to Settings
 * to change a translation toggle — instead of resetting to the topic list. */
export function useLastPracticePath(): string {
  const pathname = usePathname();
  const onPractice = pathname.startsWith("/practice");
  // Only needed for the "we're elsewhere right now" branch below — while on
  // a practice page, `pathname` itself is already the answer, no state
  // required.
  const [storedPath, setStoredPath] = useState<string | null>(null);

  useEffect(() => {
    if (onPractice) {
      try {
        sessionStorage.setItem(STORAGE_KEY, pathname);
      } catch {
        // Storage unavailable — nothing to persist, no effect on this tab.
      }
      return;
    }
    // Not on a practice page right now (e.g. we're on /settings) — pick up
    // whatever was last remembered earlier in this tab. Reading
    // sessionStorage (an external system) can only happen client-side,
    // which is exactly the documented exception to "don't setState in an
    // effect" — see the same pattern in practice-session.tsx.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a value from sessionStorage (an external system) can only run client-side.
      setStoredPath(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      // Ignore — default "/practice" stands.
    }
  }, [pathname, onPractice]);

  if (onPractice) return pathname;
  return storedPath ?? "/practice";
}
