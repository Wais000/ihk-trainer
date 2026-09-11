import { TranslatableWord } from "@/components/translation/translatable-word";
import { isTranslatableWord } from "@/lib/translation/stop-words";

/** Splits on Unicode letter runs so umlauts (ä/ö/ü/ß) stay part of the word. */
const WORD_SPLIT_RE = /(\p{L}+)/gu;

export function TranslatableText({ text, enabled }: { text: string; enabled: boolean }) {
  if (!enabled) return <>{text}</>;

  const parts = text.split(WORD_SPLIT_RE);
  return (
    <>
      {parts.map((part, i) =>
        // Not passing sentence context here: the LLM-based contextual
        // lookup it would trigger hits Google's free-tier Gemini quota
        // (20 requests/day, shared with the question-level translation
        // above) almost immediately. The full-question translation now
        // covers the "meaningful in context" need; this stays the fast,
        // high-quota, word-only Azure lookup.
        i % 2 === 1 && isTranslatableWord(part) ? (
          <TranslatableWord key={i} word={part} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
