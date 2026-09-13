"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBottomNavItems } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { useLastPracticePath } from "@/hooks/use-last-practice-path";

export function BottomNav() {
  const pathname = usePathname();
  const dict = useUiDictionary();
  const bottomNavItems = getBottomNavItems(dict);
  const lastPracticePath = useLastPracticePath();

  return (
    <nav
      aria-label={dict.nav.mainNavigation}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {bottomNavItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const linkHref = href === "/practice" ? lastPracticePath : href;
        return (
          <Link
            key={href}
            href={linkHref}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
