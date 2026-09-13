import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchPracticeQueue } from "@/lib/questions/fetch-session-questions";
import { PracticeTopicView } from "@/components/practice/practice-topic-view";
import { resetMarkedHistoryAction } from "@/app/(app)/practice/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function PracticeMarkedPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: settings }, questions, { dict }] = await Promise.all([
    supabase
      .from("user_settings")
      .select(
        "instant_translation_enabled, translate_question_enabled, translate_answers_enabled, translate_correct_answer_enabled, translate_explanation_enabled, explanation_language"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchPracticeQueue(supabase, user.id, undefined, undefined, true),
    getUiDict(),
  ]);

  // No initialHistory here on purpose — a bookmarked question is something
  // you specifically want to revisit, so it should read as "not answered"
  // when you enter this session, not carry over a stale correct/incorrect
  // outcome from wherever it was originally answered.
  const initialIndex = start ? questions.findIndex((q) => q.id === start) : undefined;

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/practice" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {dict.practice.backToCategories}
        </Link>
        <Badge variant="accent">{dict.questions.filterMarked}</Badge>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{dict.practice.noQuestionsToPractice}</p>
          </CardContent>
        </Card>
      ) : (
        <PracticeTopicView
          topicId="marked"
          resetAction={resetMarkedHistoryAction}
          questions={questions}
          initialIndex={initialIndex != null && initialIndex >= 0 ? initialIndex : undefined}
          storageKey="practice:marked"
          instantTranslationEnabled={settings?.instant_translation_enabled ?? true}
          translateQuestionEnabled={settings?.translate_question_enabled ?? true}
          translateAnswersEnabled={settings?.translate_answers_enabled ?? true}
          translateCorrectAnswerEnabled={settings?.translate_correct_answer_enabled ?? true}
          translateExplanationEnabled={settings?.translate_explanation_enabled ?? true}
          secondaryLanguage={
            settings?.explanation_language === "de" || !settings?.explanation_language
              ? "en"
              : settings.explanation_language
          }
        />
      )}
    </main>
  );
}
