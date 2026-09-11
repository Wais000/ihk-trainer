/**
 * One-time (re-runnable) generator: machine-translates the hand-authored
 * src/lib/i18n/ui/de.ts into dari.ts / he.ts via Azure Translator. Run this
 * again whenever de.ts changes. Does NOT touch question/explanation/
 * vocabulary content — this is UI-chrome text only.
 *
 * Usage: npm run generate:ui-translations
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { de } from "../src/lib/i18n/ui/de";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

type Nested = { [key: string]: string | Nested };

function flatten(obj: Nested, prefix = ""): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "string" ? [[prefix + key, value] as [string, string]] : flatten(value, prefix + key + ".")
  );
}

function unflatten(entries: [string, string][]): Nested {
  const root: Nested = {};
  for (const [path, value] of entries) {
    const parts = path.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof node[key] !== "object") node[key] = {};
      node = node[key] as Nested;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

// Placeholders like {current} must survive translation verbatim.
function protectPlaceholders(text: string): string {
  return text.replace(/\{(\w+)\}/g, '<span class="notranslate">{$1}</span>');
}
function stripNotranslateSpans(text: string): string {
  return text.replace(/<span class="notranslate">([^<]*)<\/span>/g, "$1");
}

async function translateBatch(texts: string[], targetLangs: string[]): Promise<Record<string, string>[]> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) throw new Error("Missing AZURE_TRANSLATOR_KEY or AZURE_TRANSLATOR_REGION");

  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT ?? "https://api.cognitive.microsofttranslator.com";
  const url = new URL(`${endpoint}/translate`);
  url.searchParams.set("api-version", "3.0");
  url.searchParams.set("from", "de");
  url.searchParams.set("textType", "html");
  for (const lang of targetLangs) url.searchParams.append("to", lang);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts.map((text) => ({ Text: protectPlaceholders(text) }))),
  });
  if (!response.ok) throw new Error(`Azure Translator failed: ${response.status} ${await response.text()}`);

  const results: { translations: { text: string; to: string }[] }[] = await response.json();
  return results.map((result) => {
    const byLang: Record<string, string> = {};
    for (const t of result.translations) byLang[t.to] = stripNotranslateSpans(t.text);
    return byLang;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnvLocal();
  // Translate from the hand-corrected German (not English) — this app's
  // German terminology is already domain-appropriate and unambiguous,
  // which machine translation handles far better than short,
  // context-free English labels (e.g. "Dashboard" without context biases
  // toward "car dashboard" in many target languages).
  const entries = flatten(de);
  console.log(`Translating ${entries.length} UI strings...`);

  const LANGS = [
    { code: "dari", azureCode: "prs" },
    { code: "he", azureCode: "he" },
  ];

  const perLangEntries: Record<string, [string, string][]> = { dari: [], he: [] };

  const BATCH_SIZE = 50;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    if (i > 0) await sleep(2000);
    const results = await translateBatch(
      batch.map(([, text]) => text),
      LANGS.map((l) => l.azureCode)
    );
    batch.forEach(([path], idx) => {
      for (const lang of LANGS) {
        perLangEntries[lang.code].push([path, results[idx][lang.azureCode]]);
      }
    });
    console.log(`  translated ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
  }

  // Azure's NMT occasionally invents English-looking gibberish for short,
  // context-free German compounds (observed: "dashboard.noTopic" = "Ohne
  // Thema" → "Untopic" / "آنتاپیک" instead of a real translation). Patch
  // known cases here so regenerating de.ts doesn't silently reintroduce them.
  const MANUAL_OVERRIDES: Record<string, Record<string, string>> = {
    dari: { "dashboard.noTopic": "بدون موضوع" },
    he: { "dashboard.noTopic": "ללא נושא" },
  };

  for (const lang of LANGS) {
    const overrides = MANUAL_OVERRIDES[lang.code] ?? {};
    for (const [path, value] of Object.entries(overrides)) {
      const entry = perLangEntries[lang.code].find(([p]) => p === path);
      if (entry) entry[1] = value;
    }
    const nested = unflatten(perLangEntries[lang.code]);
    const body = `/**
 * Machine-translated (Azure Translator) from src/lib/i18n/ui/de.ts by
 * scripts/generate-ui-translations.ts — do not hand-edit; re-run the
 * generator after changing de.ts instead.
 */
import type { UiDictionary } from "./en";

export const ${lang.code}: UiDictionary = ${JSON.stringify(nested, null, 2)};
`;
    writeFileSync(resolve(process.cwd(), `src/lib/i18n/ui/${lang.code}.ts`), body);
    console.log(`Wrote src/lib/i18n/ui/${lang.code}.ts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
