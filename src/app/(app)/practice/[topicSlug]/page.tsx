import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchPracticeQueue, fetchLatestAttempts } from "@/lib/questions/fetch-session-questions";
import { PracticeTopicView } from "@/components/practice/practice-topic-view";
import { Badge } from "@/components/ui/badge";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function PracticeTopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: topic } = await supabase.from("topics").select("id, name").eq("slug", topicSlug).maybeSingle();
  if (!topic) notFound();

  const [{ data: settings }, questions, { dict }] = await Promise.all([
    supabase.from("user_settings").select("instant_translation_enabled, explanation_language").eq("user_id", user.id).maybeSingle(),
    fetchPracticeQueue(supabase, user.id, undefined, topic.id),
    getUiDict(),
  ]);
  const history = await fetchLatestAttempts(supabase, user.id, questions.map((q) => q.id));

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/practice" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {dict.practice.backToCategories}
        </Link>
        <Badge variant="accent">{topic.name}</Badge>
      </div>
      <PracticeTopicView
        topicId={topic.id}
        questions={questions}
        initialHistory={history}
        storageKey={`practice:${topicSlug}`}
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
