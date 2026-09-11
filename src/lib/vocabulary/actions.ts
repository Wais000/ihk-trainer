"use server";

import { createClient } from "@/lib/supabase/server";
import { getWordTranslation } from "@/lib/translation/translate-word";

export interface VocabularyActionItem {
  id: string;
  german_word: string;
  english_meaning: string | null;
  dari_meaning: string | null;
  hebrew_meaning: string | null;
}

/** Adds a word to the vocabulary library independent of any question,
 * translating it (English + Dari + Hebrew, via the shared translation
 * cache) before storing it. Rejects a word already in the user's library
 * (case-insensitive) rather than creating a duplicate row. */
export async function addVocabularyWordAction(
  germanWord: string
): Promise<{ item: VocabularyActionItem } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const trimmed = germanWord.trim();
  if (!trimmed) return { error: "Please enter a word." };

  const { data: existing } = await supabase
    .from("question_vocabulary")
    .select("id")
    .eq("owner_id", user.id)
    .ilike("german_word", trimmed)
    .maybeSingle();
  if (existing) return { error: "duplicate" };

  let translation;
  try {
    translation = await getWordTranslation(trimmed);
  } catch (err) {
    console.error("addVocabularyWordAction translation failed:", err);
    return { error: "Could not translate the word." };
  }

  const { data, error } = await supabase
    .from("question_vocabulary")
    .insert({
      question_id: null,
      owner_id: user.id,
      german_word: translation.germanWord,
      english_meaning: translation.englishMeaning,
      dari_meaning: translation.dariMeaning,
      hebrew_meaning: translation.hebrewMeaning,
      short_german_explanation: translation.shortGermanExplanation,
      sort_order: 0,
    })
    .select("id, german_word, english_meaning, dari_meaning, hebrew_meaning")
    .single();

  if (error || !data) {
    console.error("addVocabularyWordAction insert failed:", error);
    return { error: error?.message ?? "Could not save the word." };
  }
  return { item: data };
}

/** Removes a word from the vocabulary library entirely — every row for
 * this word (across however many questions generated it), not just one
 * copy, so it doesn't silently resurface after the deduplicated list
 * picks the next remaining duplicate. */
export async function deleteVocabularyWordAction(germanWord: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase
    .from("question_vocabulary")
    .delete()
    .eq("owner_id", user.id)
    .ilike("german_word", germanWord.trim());

  if (error) return { error: error.message };
  return { success: true };
}
