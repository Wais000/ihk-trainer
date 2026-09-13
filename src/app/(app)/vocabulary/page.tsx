import { createClient } from "@/lib/supabase/server";
import { VocabularyTable } from "@/components/vocabulary/vocabulary-table";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function VocabularyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();

  const [{ data: settings }, { data: rows }] = await Promise.all([
    supabase.from("user_settings").select("explanation_language").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("question_vocabulary")
      .select("id, german_word, english_meaning, dari_meaning, hebrew_meaning")
      .eq("owner_id", user.id)
      .order("german_word", { ascending: true })
      .limit(2000),
  ]);

  // The same German word is legitimately re-generated per question it
  // appears in (question_vocabulary rows are scoped to a question, not
  // deduplicated at write time), so this library view collapses repeats —
  // one row per unique word, first occurrence wins.
  const seen = new Set<string>();
  const items = (rows ?? []).filter((row) => {
    const key = row.german_word.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const secondaryLanguage =
    settings?.explanation_language === "de" || !settings?.explanation_language ? "en" : settings.explanation_language;

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8 print:max-w-none print:gap-2 print:p-0">
      <h1 className="text-xl font-semibold print:hidden">{dict.vocabulary.title}</h1>
      <VocabularyTable items={items} secondaryLanguage={secondaryLanguage} />
    </main>
  );
}
