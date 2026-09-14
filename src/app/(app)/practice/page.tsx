import Link from "next/link";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";
import { formatTemplate } from "@/lib/i18n/format-template";

export default async function PracticeTopicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();

  const { count: markedCount } = await supabase
    .from("question_marks")
    .select("question_id, questions!inner(status)", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("questions.status", "ready");

  const { data: readyQuestions } = await supabase
    .from("questions")
    .select("topic_id")
    .eq("status", "ready")
    .not("topic_id", "is", null);

  const counts = new Map<string, number>();
  for (const q of readyQuestions ?? []) {
    if (q.topic_id) counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1);
  }

  const { data: allTopics } = await supabase.from("topics").select("id, parent_id, name, slug");
  const topicById = new Map((allTopics ?? []).map((t) => [t.id, t]));

  const cards = [...counts.entries()]
    .map(([topicId, count]) => {
      const topic = topicById.get(topicId);
      if (!topic) return null;
      const parent = topic.parent_id ? topicById.get(topic.parent_id) : null;
      return {
        slug: topic.slug,
        label: parent ? `${parent.name} – ${topic.name}` : topic.name,
        count,
      };
    })
    .filter((c): c is { slug: string; label: string; count: number } => c !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">{dict.practice.categoriesTitle}</h1>
      {cards.length === 0 && !markedCount ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{dict.practice.noCategoriesYet}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {!!markedCount && (
            <Link href="/practice/marked">
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Bookmark className="size-4 fill-primary text-primary" />
                    {dict.questions.filterMarked}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {formatTemplate(dict.practice.questionsCount, { count: markedCount })}
                  </span>
                </CardHeader>
              </Card>
            </Link>
          )}
          {cards.map((c) => (
            <Link key={c.slug} href={`/practice/${c.slug}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="text-base font-medium">{c.label}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {formatTemplate(dict.practice.questionsCount, { count: c.count })}
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
