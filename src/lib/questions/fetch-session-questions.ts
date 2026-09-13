import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionQuestion } from "@/components/practice/types";

const SESSION_SELECT = "id, question_text, marked, question_options(*), question_vocabulary(*), question_explanations(*)";

/** Practice Mode: a simple queue of ready questions, oldest-imported first,
 * optionally scoped to one category. Deliberately simple — swap this
 * ordering out later without touching the UI.
 *
 * `limit` is optional: a topic-scoped session fetches every ready question
 * in that category (so "Question N of Total" and the sidebar's number grid
 * both reflect the whole category, not an arbitrary batch), while an
 * unscoped call can still cap the queue with a limit if needed.
 *
 * `markedOnly` scopes the queue to questions the learner has bookmarked
 * (via MarkToggle) instead of a topic — the two are mutually exclusive in
 * practice, since the "Marked" session on /practice/marked never passes a
 * topicId. */
export async function fetchPracticeQueue(
  supabase: SupabaseClient,
  userId: string,
  limit?: number,
  topicId?: string,
  markedOnly?: boolean
): Promise<SessionQuestion[]> {
  let query = supabase
    .from("questions")
    .select(SESSION_SELECT)
    .eq("user_id", userId)
    .eq("status", "ready");

  if (topicId) query = query.eq("topic_id", topicId);
  if (markedOnly) query = query.eq("marked", true);

  query = query
    .order("sort_order", { foreignTable: "question_options", ascending: true })
    .order("sort_order", { foreignTable: "question_vocabulary", ascending: true })
    .order("created_at", { ascending: true });

  if (limit != null) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    // A query failure here (e.g. a column the DB migration hasn't been run
    // for yet) must not silently look like "no questions to practice" —
    // that's misleading and hides a real, fixable problem.
    console.error("fetchPracticeQueue failed:", error);
    throw new Error(`Failed to load practice questions: ${error.message}`);
  }

  return (data ?? []) as unknown as SessionQuestion[];
}

export interface QuestionHistoryEntry {
  selectedOptionId: string | null;
  isCorrect: boolean;
}

/** Most recent attempt per question. Attempts are permanent database rows,
 * not tied to any one browser session — used to seed a fresh practice
 * session (no in-progress sessionStorage) with each question's real
 * correct/incorrect history instead of resetting it to blank every time a
 * session is re-entered after finishing it once. */
export async function fetchLatestAttempts(
  supabase: SupabaseClient,
  userId: string,
  questionIds: string[]
): Promise<Record<string, QuestionHistoryEntry>> {
  if (questionIds.length === 0) return {};

  const { data } = await supabase
    .from("question_attempts")
    .select("question_id, selected_option_id, is_correct, created_at")
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .order("created_at", { ascending: false });

  const result: Record<string, QuestionHistoryEntry> = {};
  for (const row of data ?? []) {
    if (!(row.question_id in result)) {
      result[row.question_id] = { selectedOptionId: row.selected_option_id, isCorrect: row.is_correct };
    }
  }
  return result;
}

/**
 * Review Mode: prioritized per the project spec —
 * 1) repeated mistakes, 2) recent mistakes, 3) due for review, 4) guessed answers, 5) favorites.
 * Built as a few simple queries combined app-side rather than one complex SQL view,
 * which keeps it easy to reason about and to extend later.
 */
export async function fetchReviewQueue(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<SessionQuestion[]> {
  const nowIso = new Date().toISOString();

  const { data: repeatedMistakes } = await supabase
    .from("review_schedule")
    .select("question_id")
    .eq("user_id", userId)
    .gte("consecutive_wrong", 2)
    .order("consecutive_wrong", { ascending: false })
    .limit(limit);

  const { data: due } = await supabase
    .from("review_schedule")
    .select("question_id")
    .eq("user_id", userId)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(limit);

  const { data: guessed } = await supabase
    .from("question_attempts")
    .select("question_id")
    .eq("user_id", userId)
    .eq("guessed", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const orderedIds: string[] = [];
  for (const row of [...(repeatedMistakes ?? []), ...(due ?? []), ...(guessed ?? [])]) {
    if (!orderedIds.includes(row.question_id)) orderedIds.push(row.question_id);
  }

  if (orderedIds.length === 0) return [];

  const { data } = await supabase
    .from("questions")
    .select(SESSION_SELECT)
    .in("id", orderedIds.slice(0, limit))
    .eq("user_id", userId)
    .order("sort_order", { foreignTable: "question_options", ascending: true })
    .order("sort_order", { foreignTable: "question_vocabulary", ascending: true });

  const byId = new Map((data ?? []).map((q) => [(q as unknown as SessionQuestion).id, q as unknown as SessionQuestion]));
  return orderedIds.map((id) => byId.get(id)).filter((q): q is SessionQuestion => !!q).slice(0, limit);
}
