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
        i % 2 === 1 && isTranslatableWord(part) ? (
          <TranslatableWord key={i} word={part} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
