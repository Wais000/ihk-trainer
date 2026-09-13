import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StartExamButton } from "@/components/exam/start-exam-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function ExamLandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();

  const { data: inProgress } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dict.exam.title}</CardTitle>
          <CardDescription>{dict.exam.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {inProgress ? (
            <Button asChild>
              <Link href={`/exam/${inProgress.id}`}>{dict.exam.resumeExam}</Link>
            </Button>
          ) : (
            <StartExamButton />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
