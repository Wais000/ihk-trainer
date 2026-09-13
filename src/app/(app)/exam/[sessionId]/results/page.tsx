import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";
import { formatTemplate } from "@/lib/i18n/format-template";

export default async function ExamResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { dict } = await getUiDict();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("total_questions, correct_count, incorrect_count, skipped_count, duration_seconds")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: answers } = await supabase
    .from("exam_answers")
    .select("is_correct, questions(topic_id, topics(name))")
    .eq("exam_session_id", sessionId);

  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const a of answers ?? []) {
    const row = a as unknown as { is_correct: boolean | null; questions?: { topics?: { name?: string } } };
    const name = row.questions?.topics?.name ?? dict.dashboard.noTopic;
    const s = topicStats.get(name) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (row.is_correct) s.correct += 1;
    topicStats.set(name, s);
  }
  const weakTopics = [...topicStats.entries()]
    .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const percentage = session.total_questions > 0 ? Math.round((session.correct_count / session.total_questions) * 100) : 0;
  const minutes = Math.round((session.duration_seconds ?? 0) / 60);

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dict.exam.resultsTitle}</CardTitle>
          <CardDescription>{dict.exam.resultsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={dict.exam.score} value={`${percentage}%`} />
          <Stat label={dict.exam.correct} value={session.correct_count} />
          <Stat label={dict.exam.incorrect} value={session.incorrect_count} />
          <Stat label={dict.exam.skipped} value={session.skipped_count} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.exam.duration}</CardTitle>
          <CardDescription>{formatTemplate(dict.exam.minutes, { minutes })}</CardDescription>
        </CardHeader>
      </Card>

      {weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.exam.weakTopicsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {weakTopics.map((t) => (
              <div key={t.name} className="flex justify-between text-sm">
                <span>{t.name}</span>
                <span className="text-muted-foreground">{t.accuracy}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/review">{dict.exam.reviewMistakesCta}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{dict.exam.toDashboard}</Link>
        </Button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
