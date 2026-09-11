import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();
  const EVENT_LABELS: Record<string, string> = {
    question_answered: dict.history.questionAnswered,
    translation_viewed: dict.history.translationViewed,
    explanation_viewed: dict.history.explanationViewed,
  };

  const { data: activity } = await supabase
    .from("activity_log")
    .select("id, event_type, metadata, created_at, questions(question_text)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">{dict.history.title}</h1>

      <div className="flex flex-col gap-2">
        {(activity ?? []).map((entry) => {
          const row = entry as unknown as {
            id: string;
            event_type: string;
            metadata: { is_correct?: boolean } | null;
            created_at: string;
            questions?: { question_text?: string };
          };
          return (
            <Card key={row.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm">{EVENT_LABELS[row.event_type] ?? row.event_type}</p>
                {row.questions?.question_text && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{row.questions.question_text}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {row.metadata?.is_correct !== undefined && (
                  <Badge variant={row.metadata.is_correct ? "success" : "destructive"}>
                    {row.metadata.is_correct ? dict.history.correct : dict.history.incorrect}
                  </Badge>
                )}
                {new Date(row.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </Card>
          );
        })}
        {(activity ?? []).length === 0 && <p className="text-sm text-muted-foreground">{dict.history.noActivityYet}</p>}
      </div>
    </main>
  );
}
