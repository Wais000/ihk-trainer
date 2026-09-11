import type { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalQuestions: number;
  attemptsToday: number;
  correctToday: number;
  dueForReview: number;
  weakTopics: { name: string; accuracy: number; attempts: number }[];
  examReadiness: number | null; // 0–100, null if not enough data yet
  dailyTarget: number;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardStats(
  supabase: SupabaseClient,
  userId: string,
  noTopicLabel = "No topic"
): Promise<DashboardStats> {
  const [
    { count: totalQuestions },
    { data: todaysAttempts },
    { count: dueForReview },
    { data: recentAttempts },
    { data: settings },
  ] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("question_attempts")
      .select("is_correct")
      .eq("user_id", userId)
      .gte("created_at", startOfToday()),
    supabase
      .from("review_schedule")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_at", new Date().toISOString()),
    supabase
      .from("question_attempts")
      .select("is_correct, question_id, questions(topic_id, topics(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("user_settings").select("daily_target").eq("user_id", userId).maybeSingle(),
  ]);

  const attemptsToday = todaysAttempts?.length ?? 0;
  const correctToday = todaysAttempts?.filter((a) => a.is_correct).length ?? 0;

  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const attempt of recentAttempts ?? []) {
    // Supabase's nested-select typing here is loose; the shape is validated at runtime.
    const q = attempt as unknown as { is_correct: boolean; questions?: { topics?: { name?: string } } };
    const topicName = q.questions?.topics?.name ?? noTopicLabel;
    const stat = topicStats.get(topicName) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (q.is_correct) stat.correct += 1;
    topicStats.set(topicName, stat);
  }

  const weakTopics = [...topicStats.entries()]
    .filter(([, s]) => s.total >= 3)
    .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100), attempts: s.total }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const examReadiness =
    (recentAttempts?.length ?? 0) >= 10
      ? Math.round(((recentAttempts?.filter((a) => a.is_correct).length ?? 0) / (recentAttempts?.length ?? 1)) * 100)
      : null;

  return {
    totalQuestions: totalQuestions ?? 0,
    attemptsToday,
    correctToday,
    dueForReview: dueForReview ?? 0,
    weakTopics,
    examReadiness,
    dailyTarget: settings?.daily_target ?? 100,
  };
}
