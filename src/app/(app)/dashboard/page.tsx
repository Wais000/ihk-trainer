import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/analytics/dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, RotateCcw, Clock, Upload } from "lucide-react";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();
  const stats = await getDashboardStats(supabase, user.id, dict.dashboard.noTopic);
  const progressPct = Math.min(100, Math.round((stats.attemptsToday / stats.dailyTarget) * 100));
  const accuracyPct = stats.attemptsToday > 0 ? Math.round((stats.correctToday / stats.attemptsToday) * 100) : null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">{dict.dashboard.title}</h1>

      {/* Primary actions — the most important thing on the screen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild size="touch" className="flex-col gap-1">
          <Link href="/practice"><BookOpenCheck className="size-5" />{dict.dashboard.practiceCta}</Link>
        </Button>
        <Button asChild size="touch" variant="secondary" className="flex-col gap-1">
          <Link href="/review"><RotateCcw className="size-5" />{dict.dashboard.reviewMistakesCta}</Link>
        </Button>
        <Button asChild size="touch" variant="secondary" className="flex-col gap-1">
          <Link href="/exam"><Clock className="size-5" />{dict.dashboard.examModeCta}</Link>
        </Button>
        <Button asChild size="touch" variant="secondary" className="flex-col gap-1">
          <Link href="/questions/import"><Upload className="size-5" />{dict.dashboard.importCta}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.dailyGoal}</CardTitle>
          <CardDescription>
            {stats.attemptsToday} / {stats.dailyTarget}
            {accuracyPct !== null && ` · ${accuracyPct}% ${dict.dashboard.percentCorrectToday}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-muted" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.questionsDue}</CardTitle>
            <CardDescription>{stats.dueForReview} {dict.dashboard.readyForReview}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.readinessTitle}</CardTitle>
            <CardDescription>
              {stats.examReadiness !== null
                ? `${stats.examReadiness}% — ${dict.dashboard.readinessDisclaimer}`
                : dict.dashboard.notEnoughPracticeForEstimate}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {stats.weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.weakerTopics}</CardTitle>
            <CardDescription>{dict.dashboard.basedOnRecentAnswers}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.weakTopics.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <span>{t.name}</span>
                <span className="text-muted-foreground">{t.accuracy}% ({t.attempts} {dict.dashboard.attempts})</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.totalQuestions === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.noQuestionsYet}</CardTitle>
            <CardDescription>{dict.dashboard.importFirstQuestionsPrompt}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/questions/import">{dict.dashboard.importQuestionsCta}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
