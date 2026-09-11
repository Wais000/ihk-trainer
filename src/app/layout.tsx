import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";
import { dirFor } from "@/lib/i18n/languages";
import { UiI18nProvider } from "@/components/i18n/ui-i18n-provider";
import type { ExplanationLanguage } from "@/lib/validation/question";
import type { AppTheme } from "@/lib/types/database";

// next/font self-hosts these at build time (no runtime request to Google's
// CDN, works offline like the previous system-ui stack) while matching the
// reference design's typefaces (--font-body: 'Sora', --font-mono: 'JetBrains Mono').
const sora = Sora({ subsets: ["latin"], variable: "--font-sans-override", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-override", display: "swap" });

export const metadata: Metadata = {
  title: "IHK Prüfungstrainer",
  description: "IHK Exam Trainer — practice, review and track IHK exam questions.",
};

// Runs before paint (blocking <script>, no `defer`/`async`) so "system"
// resolves to the OS preference with no flash of the wrong theme, and
// keeps following OS changes while the tab stays open.
const THEME_SCRIPT = `
(function () {
  var pref = document.documentElement.getAttribute("data-theme-pref");
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    if (pref === "system") {
      document.documentElement.classList.toggle("dark", media.matches);
    }
  }
  apply();
  media.addEventListener("change", apply);
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let uiLanguage: ExplanationLanguage = "en";
  let theme: AppTheme = "system";
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("ui_language, theme")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settings?.ui_language) uiLanguage = settings.ui_language;
    if (settings?.theme) theme = settings.theme;
  }

  const dict = getUiDictionary(uiLanguage);
  // "system" is resolved client-side (via THEME_SCRIPT, before paint) since
  // the server can't know the OS preference — "light"/"dark" are fully
  // determined here, so those two render correctly with zero flash.
  const isDark = theme === "dark";

  return (
    <html
      lang={uiLanguage === "dari" ? "prs" : uiLanguage}
      dir={dirFor(uiLanguage)}
      data-theme-pref={theme}
      className={
        isDark
          ? `h-full antialiased dark ${sora.variable} ${jetbrainsMono.variable}`
          : `h-full antialiased ${sora.variable} ${jetbrainsMono.variable}`
      }
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <UiI18nProvider dict={dict} lang={uiLanguage}>
          {children}
        </UiI18nProvider>
      </body>
    </html>
  );
}
