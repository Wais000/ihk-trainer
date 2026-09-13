import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveAllReadyItemsAction } from "@/app/(app)/questions/import/actions";
import { ImportItemCard } from "@/components/import/import-item-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ParsedQuestion } from "@/lib/validation/question";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";
import { formatTemplate } from "@/lib/i18n/format-template";

export default async function ImportReviewPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const supabase = await createClient();
  const { dict } = await getUiDict();

  const { data: importRow } = await supabase.from("imports").select("id, total_items, created_at").eq("id", importId).single();
  if (!importRow) notFound();

  const { data: items } = await supabase
    .from("import_items")
    .select("id, status, parsed")
    .eq("import_id", importId)
    .order("created_at", { ascending: true });

  const counts = {
    total: items?.length ?? 0,
    saved: items?.filter((i) => i.status === "saved").length ?? 0,
    needsReview: items?.filter((i) => i.status === "needs_review").length ?? 0,
    duplicate: items?.filter((i) => i.status === "duplicate").length ?? 0,
    failed: items?.filter((i) => i.status === "failed").length ?? 0,
    readyToSave: items?.filter((i) => i.status === "parsed").length ?? 0,
  };

  async function handleSaveAll() {
    "use server";
    await saveAllReadyItemsAction(importId);
  }

  return (
    <main className="mx-auto flex max-w-[852px] flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dict.importFlow.overviewTitle}</CardTitle>
          <CardDescription>
            {formatTemplate(dict.importFlow.overviewCountsSummary, {
              total: counts.total,
              saved: counts.saved,
              needsReview: counts.needsReview,
              duplicate: counts.duplicate,
            })}
            {counts.failed > 0 && formatTemplate(dict.importFlow.overviewCountsFailedSuffix, { failed: counts.failed })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {counts.readyToSave > 0 && (
            <form action={handleSaveAll}>
              <Button type="submit">
                {formatTemplate(dict.importFlow.saveAllReady, { count: counts.readyToSave })}
              </Button>
            </form>
          )}
        </CardContent>
        {counts.saved > 0 && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{dict.importFlow.enrichOfflineNotice}</p>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        {items?.map((item) => (
          <ImportItemCard
            key={item.id}
            id={item.id}
            status={item.status}
            parsed={item.parsed as unknown as ParsedQuestion}
          />
        ))}
      </div>
    </main>
  );
}
