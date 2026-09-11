"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LANGUAGE_LABELS, dirFor } from "@/lib/i18n/languages";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { formatTemplate } from "@/lib/i18n/format-template";
import { addVocabularyWordAction, deleteVocabularyWordAction } from "@/lib/vocabulary/actions";
import type { ExplanationLanguage } from "@/lib/validation/question";

export interface VocabularyRow {
  id: string;
  german_word: string;
  english_meaning: string | null;
  dari_meaning: string | null;
  hebrew_meaning: string | null;
}

export interface VocabularyTableProps {
  items: VocabularyRow[];
  /** The user's preferred non-German language (Settings → "Bevorzugte
   * Sprache") — shown as the extra column alongside English, unless it IS
   * English (avoids a duplicate column). */
  secondaryLanguage: ExplanationLanguage;
}

function meaningFor(item: VocabularyRow, lang: ExplanationLanguage): string | null {
  if (lang === "en") return item.english_meaning;
  if (lang === "dari") return item.dari_meaning;
  if (lang === "he") return item.hebrew_meaning;
  return null;
}

export function VocabularyTable({ items, secondaryLanguage }: VocabularyTableProps) {
  const dict = useUiDictionary();
  const [rows, setRows] = useState(items);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selected = secondaryLanguage === "de" ? "en" : secondaryLanguage;
  // English is always offered; the selected language joins it unless it IS
  // English — these are the only two columns a user can toggle, German stays.
  const toggleableLanguages = useMemo<ExplanationLanguage[]>(
    () => (selected === "en" ? ["en"] : ["en", selected]),
    [selected]
  );
  const [hidden, setHidden] = useState<Set<ExplanationLanguage>>(new Set());

  const visibleLanguages = toggleableLanguages.filter((lang) => !hidden.has(lang));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      if (item.german_word.toLowerCase().includes(q)) return true;
      return toggleableLanguages.some((lang) => meaningFor(item, lang)?.toLowerCase().includes(q));
    });
  }, [rows, search, toggleableLanguages]);

  function toggleLanguage(lang: ExplanationLanguage) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      return next;
    });
  }

  async function handleDelete(item: VocabularyRow) {
    if (!window.confirm(formatTemplate(dict.vocabulary.confirmDeleteWord, { word: item.german_word }))) return;
    setRows((prev) => prev.filter((r) => r.german_word.toLowerCase() !== item.german_word.toLowerCase()));
    await deleteVocabularyWordAction(item.german_word);
  }

  async function handleAdd() {
    setAddError(null);
    setAdding(true);
    const result = await addVocabularyWordAction(newWord);
    setAdding(false);
    if ("error" in result) {
      setAddError(result.error === "duplicate" ? dict.vocabulary.duplicateWord : dict.vocabulary.addWordFailed);
      return;
    }
    setRows((prev) => [result.item, ...prev]);
    setNewWord("");
    setShowAddDialog(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setNewWord("");
            setAddError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.vocabulary.addWordTitle}</DialogTitle>
            <DialogDescription>{dict.vocabulary.addWordDescription}</DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newWord.trim() && !adding) handleAdd();
            }}
            placeholder={dict.vocabulary.germanWordPlaceholder}
            autoFocus
            className="mt-3 h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={adding}>
              {dict.vocabulary.cancel}
            </Button>
            <Button onClick={handleAdd} disabled={adding || !newWord.trim()}>
              {adding ? dict.vocabulary.saving : dict.vocabulary.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.vocabulary.searchPlaceholder}
            className="h-11 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="size-4" />
          {dict.vocabulary.addWord}
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
          <Printer className="size-4" />
          {dict.vocabulary.print}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
        <span className="font-medium text-muted-foreground">{dict.vocabulary.columns}:</span>
        {toggleableLanguages.map((lang) => (
          <Button
            key={lang}
            variant={hidden.has(lang) ? "outline" : "accent"}
            size="pill"
            onClick={() => toggleLanguage(lang)}
            aria-pressed={!hidden.has(lang)}
          >
            {LANGUAGE_LABELS[lang]}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground print:hidden">
        {formatTemplate(dict.vocabulary.wordCount, { count: filtered.length })}
      </p>

      <Card className="overflow-x-auto print:border-0 print:shadow-none">
        <table className="w-full border-collapse text-sm print:text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground print:border-b-2 print:border-black print:text-black">
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1.5">{dict.common.germanColumnHeader}</th>
              {visibleLanguages.map((lang) => (
                <th key={lang} className="px-4 py-2.5 font-medium print:px-2 print:py-1.5">
                  {LANGUAGE_LABELS[lang]}
                </th>
              ))}
              <th className="w-10 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="group break-inside-avoid border-b border-border last:border-0 print:border-b print:border-gray-300"
              >
                <td className="px-4 py-2.5 font-medium print:px-2 print:py-1">{item.german_word}</td>
                {visibleLanguages.map((lang) => (
                  <td key={lang} className="px-4 py-2.5 print:px-2 print:py-1" dir={dirFor(lang)}>
                    {meaningFor(item, lang) ?? "—"}
                  </td>
                ))}
                <td className="px-2 py-2.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    aria-label={dict.vocabulary.deleteWord}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2 + visibleLanguages.length} className="px-4 py-6 text-center text-muted-foreground">
                  {rows.length === 0 ? dict.vocabulary.noneYet : dict.vocabulary.noResults}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
