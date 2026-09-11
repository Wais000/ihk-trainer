import {
  LayoutDashboard,
  BookOpenCheck,
  RotateCcw,
  Clock,
  Library,
  Languages,
  History,
  Settings,
} from "lucide-react";
import type { UiDictionary } from "@/lib/i18n/ui/dictionary";

export function getNavItems(dict: UiDictionary) {
  return [
    { href: "/dashboard", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/practice", label: dict.nav.practice, icon: BookOpenCheck },
    { href: "/review", label: dict.nav.review, icon: RotateCcw },
    { href: "/exam", label: dict.nav.exam, icon: Clock },
    { href: "/questions", label: dict.nav.questions, icon: Library },
    { href: "/vocabulary", label: dict.nav.vocabulary, icon: Languages },
    { href: "/history", label: dict.nav.history, icon: History },
    { href: "/settings", label: dict.nav.settings, icon: Settings },
  ] as const;
}

// Mobile keeps only the most frequent actions reachable with a thumb.
export function getBottomNavItems(dict: UiDictionary) {
  const items = getNavItems(dict);
  return [items[0], items[1], items[2], items[3], items[4]] as const;
}
