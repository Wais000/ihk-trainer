import { translateFromGerman } from "@/lib/translation/azure-translator";
import type { WordTranslation } from "@/lib/validation/translation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

function normalize(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?„“"'()\[\]]/g, "");
}

/** Returns the translation for one German word, via Azure Translator —
 * cached globally (shared across all users) since a bare word's meaning
 * doesn't depend on who's asking. This is the only live translation call
 * anywhere in the app; every other translation (question, answer options,
 * explanation, vocabulary) is pre-generated offline (see
 * scripts/prompts/*.md) and only ever read from the database. */
export async function getWordTranslation(rawWord: string): Promise<WordTranslation> {
  const normalized = normalize(rawWord);
  if (!normalized) {
    return {
      germanWord: rawWord,
      englishMeaning: null,
      dariMeaning: null,
      hebrewMeaning: null,
      shortGermanExplanation: null,
    };
  }

  const supabase = await createClient();
  const { data: cached } = await supabase
    .from("translations")
    .select("german_word, english_meaning, dari_meaning, hebrew_meaning, short_german_explanation")
    .eq("german_word_normalized", normalized)
    .maybeSingle();

  if (cached) {
    return {
      germanWord: cached.german_word,
      englishMeaning: cached.english_meaning,
      dariMeaning: cached.dari_meaning,
      hebrewMeaning: cached.hebrew_meaning,
      shortGermanExplanation: cached.short_german_explanation,
    };
  }

  // Dari's Azure language code is "prs" (distinct from Persian "fa").
  const translations = await translateFromGerman(rawWord, ["en", "prs", "he"]);

  const object: WordTranslation = {
    germanWord: rawWord,
    englishMeaning: translations.en ?? null,
    dariMeaning: translations.prs ?? null,
    hebrewMeaning: translations.he ?? null,
    // Azure Translator does machine translation only, not a learner-facing
    // explanation of the word's meaning/context — left null by design.
    shortGermanExplanation: null,
  };

  // Cache writes go through the service-role client: the `translations`
  // table intentionally has no authenticated-role INSERT policy, since it
  // is shared/global rather than per-user data (see migration 0001).
  const serviceClient = createServiceRoleClient();
  await serviceClient.from("translations").upsert(
    {
      german_word: object.germanWord,
      german_word_normalized: normalized,
      english_meaning: object.englishMeaning,
      dari_meaning: object.dariMeaning,
      hebrew_meaning: object.hebrewMeaning,
      short_german_explanation: object.shortGermanExplanation,
    },
    { onConflict: "german_word_normalized" }
  );

  return object;
}
