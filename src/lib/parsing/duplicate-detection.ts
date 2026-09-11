/** Lowercases, strips punctuation, collapses whitespace — used both for the
 * DB `question_text_normalized` column and for in-memory similarity checks. */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents so ä/a compare loosely — good enough for duplicate detection
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter((t) => t.length > 2)); // drop short filler tokens
}

/** Jaccard similarity (0–1) between two already-normalized strings' token sets. */
export function textSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Above this similarity, two questions are treated as likely duplicates. */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.82;

export interface DuplicateCandidate {
  id: string;
  questionTextNormalized: string;
}

/** Returns the closest existing question above the similarity threshold, if any. */
export function findLikelyDuplicate(
  newNormalized: string,
  existing: DuplicateCandidate[]
): DuplicateCandidate | null {
  let best: DuplicateCandidate | null = null;
  let bestScore = 0;
  for (const candidate of existing) {
    const score = textSimilarity(newNormalized, candidate.questionTextNormalized);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= DUPLICATE_SIMILARITY_THRESHOLD ? best : null;
}
