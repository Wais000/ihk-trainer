import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExplanationView } from "@/components/questions/explanation-view";
import { VocabularyPanel } from "@/components/practice/vocabulary-panel";
import { FavoriteToggle } from "@/components/questions/favorite-toggle";
import { MarkToggle } from "@/components/questions/mark-toggle";
import { FlagQuestionForm } from "@/components/questions/flag-question-form";
import { getQuestionTranslation } from "@/lib/translation/translate-question";
import { dirFor } from "@/lib/i18n/languages";
import type { ExplanationLanguage } from "@/lib/validation/question";
import type { SessionVocabularyItem } from "@/components/practice/types";
import { splitIntoSentences } from "@/lib/text/format-explanation";

export default async function QuestionDetailPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: question } = await supabase
    .from("questions")
    .select(
      "id, question_text, favorite, marked, topics(name), question_options(id, label, option_text, is_correct, sort_order), question_vocabulary(*), question_explanations(*)"
    )
    .eq("id", questionId)
    .single();
  if (!question) notFound();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("explanation_language")
    .eq("user_id", user.id)
    .maybeSingle();

  const q = question as unknown as {
    id: string;
    question_text: string;
    favorite: boolean;
    marked: boolean;
    topics?: { name?: string };
    question_options: { id: string; label: string; option_text: string; is_correct: boolean; sort_order: number }[];
    question_vocabulary: SessionVocabularyItem[];
    question_explanations: { language: ExplanationLanguage; summary: string; why_correct: string | null; why_incorrect: string | null; common_trap: string | null; tested_concept: string | null }[];
  };

  const explanationsByLanguage = Object.fromEntries(
    q.question_explanations.map((e) => [
      e.language,
      { summary: e.summary, whyCorrect: e.why_correct, whyIncorrect: e.why_incorrect, commonTrap: e.common_trap, testedConcept: e.tested_concept },
    ])
  );

  const secondaryLanguage: ExplanationLanguage =
    settings?.explanation_language === "de" || !settings?.explanation_language ? "en" : settings.explanation_language;

  const questionTranslation = await getQuestionTranslation(supabase, q.id, user.id, secondaryLanguage, q.question_text).catch(
    (err) => {
      console.error("getQuestionTranslation failed:", err);
      return null;
    }
  );

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-col gap-1 text-base font-normal leading-relaxed">
              {splitIntoSentences(q.question_text).map((sentence, i) => (
                <span key={i}>{sentence}</span>
              ))}
            </CardTitle>
            {q.topics?.name && <Badge variant="outline" className="mt-2">{q.topics.name}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <MarkToggle questionId={q.id} initialMarked={q.marked} />
            <FavoriteToggle questionId={q.id} initialFavorite={q.favorite} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {questionTranslation && (
            <div className="rounded-md border border-accent bg-accent/40 px-3 py-2.5">
              <p dir={dirFor(secondaryLanguage)} className="text-sm leading-relaxed text-accent-foreground">
                {questionTranslation}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {[...q.question_options].sort((a, b) => a.sort_order - b.sort_order).map((option) => (
              <div
                key={option.id}
                className={`flex items-start gap-[14px] rounded-md border-2 px-[18px] py-[14px] text-[15px] leading-[1.5] transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  option.is_correct ? "border-success bg-success/10" : "border-border bg-card"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                    option.is_correct
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-foreground">{option.option_text}</span>
              </div>
            ))}
          </div>

          {q.question_vocabulary.length > 0 && (
            <VocabularyPanel items={q.question_vocabulary} secondaryLanguage={secondaryLanguage} />
          )}

          {Object.keys(explanationsByLanguage).length > 0 && (
            <ExplanationView
              explanations={explanationsByLanguage}
              secondaryLanguage={secondaryLanguage}
              correctLabel={q.question_options.find((o) => o.is_correct)?.label ?? ""}
            />
          )}

          <FlagQuestionForm questionId={q.id} />
        </CardContent>
      </Card>
    </main>
  );
}
