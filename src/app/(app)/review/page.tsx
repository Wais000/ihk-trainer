import { createClient } from "@/lib/supabase/server";
import { fetchReviewQueue } from "@/lib/questions/fetch-session-questions";
import { PracticeSession } from "@/components/practice/practice-session";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: settings }, questions, { dict }] = await Promise.all([
    supabase.from("user_settings").select("instant_translation_enabled, explanation_language").eq("user_id", user.id).maybeSingle(),
    fetchReviewQueue(supabase, user.id),
    getUiDict(),
  ]);

  return (
    <main className="mx-auto max-w-[852px] px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">{dict.nav.review}</h1>
      <PracticeSession
        questions={questions}
        mode="review"
        storageKey="review"
        instantTranslationEnabled={settings?.instant_translation_enabled ?? true}
        secondaryLanguage={
          settings?.explanation_language === "de" || !settings?.explanation_language
            ? "en"
            : settings.explanation_language
        }
      />
    </main>
  );
}
