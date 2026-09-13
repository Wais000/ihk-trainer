import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExamSession, type ExamAnswerItem } from "@/components/exam/exam-session";
import { EXAM_DURATION_SECONDS } from "@/lib/exam/constants";

export default async function ExamSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, status, started_at")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  if (session.status === "completed") redirect(`/exam/${sessionId}/results`);

  const { data: answers } = await supabase
    .from("exam_answers")
    .select(
      "id, selected_option_id, marked_for_review, questions(id, question_text, question_options(id, label, option_text, sort_order))"
    )
    .eq("exam_session_id", sessionId)
    .order("sort_order", { ascending: true });

  const items: ExamAnswerItem[] = (answers ?? []).map((a) => {
    const q = a as unknown as {
      id: string;
      selected_option_id: string | null;
      marked_for_review: boolean;
      questions: { id: string; question_text: string; question_options: { id: string; label: string; option_text: string; sort_order: number }[] };
    };
    return {
      examAnswerId: q.id,
      questionId: q.questions.id,
      questionText: q.questions.question_text,
      options: [...q.questions.question_options]
        .sort((x, y) => x.sort_order - y.sort_order)
        .map((o) => ({ id: o.id, label: o.label, option_text: o.option_text })),
      selectedOptionId: q.selected_option_id,
      markedForReview: q.marked_for_review,
    };
  });

  return (
    <main className="mx-auto max-w-[852px] px-4 py-8">
      <ExamSession
        sessionId={sessionId}
        items={items}
        startedAtIso={session.started_at}
        durationSeconds={EXAM_DURATION_SECONDS}
      />
    </main>
  );
}
