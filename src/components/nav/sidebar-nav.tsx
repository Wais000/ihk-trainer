"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItems } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/auth/actions";
import { LogOut } from "lucide-react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { PracticeQuestionGrid } from "@/components/nav/practice-question-grid";
import { MarkedQuestionsWidget } from "@/components/nav/marked-questions-widget";
import { useLastPracticePath } from "@/hooks/use-last-practice-path";

export function SidebarNav() {
  const pathname = usePathname();
  const dict = useUiDictionary();
  const navItems = getNavItems(dict);
  const lastPracticePath = useLastPracticePath();

  return (
    <nav
      aria-label={dict.nav.mainNavigation}
      className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-card px-3 py-6 md:flex print:hidden"
    >
      <p className="mb-6 px-3 text-sm font-semibold">{dict.nav.appName}</p>
      <ul className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const linkHref = href === "/practice" ? lastPracticePath : href;
          return (
            <li key={href}>
              <Link
                href={linkHref}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col gap-3 pt-4">
        <MarkedQuestionsWidget />
        <PracticeQuestionGrid />
        <form
          action={signOutAction}
          onSubmit={() => {
            // Practice/review progress is cached in sessionStorage, which
            // the browser keeps for the whole tab lifetime — it survives a
            // logout. Without this, a later login (even as a different
            // account, on a shared device) would incorrectly "resume" the
            // previous account's in-progress session instead of showing
            // this account's real, database-backed history.
            try {
              sessionStorage.clear();
            } catch {
              // Storage unavailable — sign-out still proceeds normally.
            }
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {dict.nav.signOut}
          </button>
        </form>
      </div>
    </nav>
  );
}
