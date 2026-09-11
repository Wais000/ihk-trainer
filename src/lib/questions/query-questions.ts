import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionFilter = "all" | "wrong" | "correct" | "due" | "unanswered" | "favorites" | "marked";

export interface QuestionListItem {
  id: string;
  question_text: string;
  difficulty: number | null;
  favorite: boolean;
  marked: boolean;
  topicName: string | null;
}

const PAGE_SIZE = 20;

export async function queryQuestions(
  supabase: SupabaseClient,
  userId: string,
  options: { filter: QuestionFilter; search: string; page: number }
): Promise<{ items: QuestionListItem[]; total: number }> {
  let query = supabase
    .from("questions")
    .select("id, question_text, difficulty, favorite, marked, topics(name)")
    .eq("user_id", userId);

  if (options.search.trim()) {
    query = query.ilike("question_text", `%${options.search.trim()}%`);
  }
  if (options.filter === "favorites") {
    query = query.eq("favorite", true);
  }
  if (options.filter === "marked") {
    query = query.eq("marked", true);
  }

  const { data: allMatching } = await query;
  let items: QuestionListItem[] = (allMatching ?? []).map((q) => {
    const row = q as unknown as {
      id: string;
      question_text: string;
      difficulty: number | null;
      favorite: boolean;
      marked: boolean;
      topics?: { name?: string };
    };
    return {
      id: row.id,
      question_text: row.question_text,
      difficulty: row.difficulty,
      favorite: row.favorite,
      marked: row.marked,
      topicName: row.topics?.name ?? null,
    };
  });

  if (options.filter === "wrong" || options.filter === "correct" || options.filter === "unanswered") {
    // "Wrong"/"Correct" reflect the MOST RECENT attempt per question, same
    // as the sidebar grid and topic overview — not "was ever wrong/right",
    // which would keep a question in both filters forever after a mistake
    // even once you've since gotten it right.
    const { data: attempts } = await supabase
      .from("question_attempts")
      .select("question_id, is_correct, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const latestByQuestion = new Map<string, boolean>();
    for (const a of attempts ?? []) {
      if (!latestByQuestion.has(a.question_id)) latestByQuestion.set(a.question_id, a.is_correct);
    }

    if (options.filter === "unanswered") items = items.filter((q) => !latestByQuestion.has(q.id));
    if (options.filter === "wrong") items = items.filter((q) => latestByQuestion.get(q.id) === false);
    if (options.filter === "correct") items = items.filter((q) => latestByQuestion.get(q.id) === true);
  }

  if (options.filter === "due") {
    const { data: due } = await supabase
      .from("review_schedule")
      .select("question_id")
      .eq("user_id", userId)
      .lte("next_review_at", new Date().toISOString());
    const dueIds = new Set((due ?? []).map((d) => d.question_id));
    items = items.filter((q) => dueIds.has(q.id));
  }

  const total = items.length;
  const start = (options.page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), total };
}

export { PAGE_SIZE };
