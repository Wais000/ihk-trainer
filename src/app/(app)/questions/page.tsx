import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { queryQuestions, PAGE_SIZE, type QuestionFilter } from "@/lib/questions/query-questions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Star, Bookmark } from "lucide-react";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";
import { formatTemplate } from "@/lib/i18n/format-template";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as QuestionFilter) ?? "all";
  const search = params.q ?? "";
  const page = Number(params.page ?? "1") || 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { dict } = await getUiDict();
  const FILTERS: { value: QuestionFilter; label: string }[] = [
    { value: "all", label: dict.questions.filterAll },
    { value: "wrong", label: dict.questions.filterWrong },
    { value: "correct", label: dict.questions.filterCorrect },
    { value: "due", label: dict.questions.filterDue },
    { value: "unanswered", label: dict.questions.filterUnanswered },
    { value: "favorites", label: dict.questions.filterFavorites },
    { value: "marked", label: dict.questions.filterMarked },
  ];

  const { items, total } = await queryQuestions(supabase, user.id, { filter, search, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">{dict.questions.title}</h1>

      <form className="flex items-center gap-2" action="/questions">
        <input type="hidden" name="filter" value={filter} />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder={dict.questions.searchPlaceholder}
            className="h-11 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" variant="secondary">
          {dict.questions.searchCta}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <Button key={f.value} asChild variant={filter === f.value ? "accent" : "outline"} size="pill">
              <Link
                href={`/questions?filter=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                role="tab"
                aria-selected={filter === f.value}
              >
                {f.label}
              </Link>
            </Button>
          ))}
        </div>
        {filter === "marked" && items.length > 0 && (
          <Button asChild size="sm">
            <Link href="/practice/marked">{dict.nav.practice}</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{dict.questions.noResults}</p>}
        {items.map((q) => (
          <Link key={q.id} href={filter === "marked" ? `/practice/marked?start=${q.id}` : `/questions/${q.id}`}>
            <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/40">
              <p className="text-sm leading-relaxed">{q.question_text}</p>
              <div className="flex shrink-0 items-center gap-2">
                {q.topicName && <Badge variant="outline">{q.topicName}</Badge>}
                {/* Marked questions are treated as fresh/not-answered (see
                    /practice/marked), so this list shows that instead of
                    the real, possibly stale, last-attempt outcome. */}
                {filter === "marked" && <Badge variant="outline">{dict.questions.filterUnanswered}</Badge>}
                {q.marked && <Bookmark className="size-4 fill-primary text-primary" />}
                {q.favorite && <Star className="size-4 fill-warning text-warning" />}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/questions?filter=${filter}&page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}>
              <Button variant="outline" size="sm">{dict.questions.back}</Button>
            </Link>
          )}
          <span className="text-muted-foreground">{formatTemplate(dict.questions.pageOf, { current: page, total: totalPages })}</span>
          {page < totalPages && (
            <Link href={`/questions?filter=${filter}&page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}>
              <Button variant="outline" size="sm">{dict.questions.next}</Button>
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
