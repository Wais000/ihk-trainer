/** Splits text into sentence-like chunks at sentence-ending punctuation
 * (":", ".", "!", "?") followed by whitespace and a capital letter/digit —
 * used to break a long, multi-clause question stem into separate lines. */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[:.!?])\s+(?=[A-ZÄÖÜ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits a why-incorrect explanation blob into one chunk per referenced
 * answer letter (e.g. "A ist falsch... B ist falsch...") — the letter stays
 * a literal Latin A-H in every language (see azure-translator.ts), so this
 * split works the same regardless of language. */
export function splitByLetterReferences(text: string): string[] {
  return text
    .split(/(?=\b[A-H]\b\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
