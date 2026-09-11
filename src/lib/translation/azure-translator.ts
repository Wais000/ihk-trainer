const DEFAULT_ENDPOINT = "https://api.cognitive.microsofttranslator.com";

interface AzureTranslateResponseItem {
  translations: { text: string; to: string }[];
}

// Answer-option references (e.g. "A ist falsch") are standalone letters that
// must stay Latin A-H in every language, matching the app's fixed option
// badges — left alone, Azure's NMT "localizes" them into the target
// language's own letter-naming convention (e.g. Dari "الف", Hebrew "א'"),
// breaking the correspondence with the UI. Wrapping them in an HTML
// notranslate span (with textType=html) keeps them literal.
function protectLetterReferences(text: string): string {
  return text.replace(/\b([A-H])\b/g, '<span class="notranslate">$1</span>');
}

function stripNotranslateSpans(text: string): string {
  return text.replace(/<span class="notranslate">([^<]*)<\/span>/g, "$1");
}

function buildTranslateUrl(endpoint: string, targetLangs: string[]): URL {
  const url = new URL(`${endpoint}/translate`);
  url.searchParams.set("api-version", "3.0");
  url.searchParams.set("from", "de");
  url.searchParams.set("textType", "html");
  for (const lang of targetLangs) url.searchParams.append("to", lang);
  return url;
}

/**
 * Translates a short string from German into the given target language
 * codes via the Azure AI Translator REST API (F0 free tier: 2M chars/month).
 * Returns a map of language code -> translated text.
 */
export async function translateFromGerman(
  text: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error("Missing AZURE_TRANSLATOR_KEY or AZURE_TRANSLATOR_REGION");
  }

  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT ?? DEFAULT_ENDPOINT;
  const url = buildTranslateUrl(endpoint, targetLangs);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ Text: protectLetterReferences(text) }]),
  });

  if (!response.ok) {
    throw new Error(`Azure Translator request failed: ${response.status} ${await response.text()}`);
  }

  const [result]: AzureTranslateResponseItem[] = await response.json();
  const byLang: Record<string, string> = {};
  for (const translation of result.translations) {
    byLang[translation.to] = stripNotranslateSpans(translation.text);
  }
  return byLang;
}

/**
 * Translates several German texts (e.g. every field of a structured
 * explanation) into the given target languages in a single Azure request.
 * Returns one language->text map per input text, in the same order.
 */
export async function translateManyFromGerman(
  texts: string[],
  targetLangs: string[]
): Promise<Record<string, string>[]> {
  if (texts.length === 0) return [];

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error("Missing AZURE_TRANSLATOR_KEY or AZURE_TRANSLATOR_REGION");
  }

  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT ?? DEFAULT_ENDPOINT;
  const url = buildTranslateUrl(endpoint, targetLangs);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts.map((text) => ({ Text: protectLetterReferences(text) }))),
  });

  if (!response.ok) {
    throw new Error(`Azure Translator request failed: ${response.status} ${await response.text()}`);
  }

  const results: AzureTranslateResponseItem[] = await response.json();
  return results.map((result) => {
    const byLang: Record<string, string> = {};
    for (const translation of result.translations) byLang[translation.to] = stripNotranslateSpans(translation.text);
    return byLang;
  });
}
