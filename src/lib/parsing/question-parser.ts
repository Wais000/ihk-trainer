import type { ParsedOption, ParsedQuestion } from "@/lib/validation/question";

const OPTION_LABEL_ONLY_RE = /^([A-H])$/;
const OPTION_LABEL_INLINE_RE = /^([A-H])[).:]\s+(.+)$/;
const CORRECT_ANSWER_LABEL_LINE_RE = /^Correct Answer\s*:?\s*([A-H])?$/i;
const RESULT_MARKER_RE = /^(Correct!|Incorrect)\s*(Your answer\s*:\s*[A-H])?$/i;
const CHECK_MARK_RE = /^[✓✔✗✘]$/;
const QUESTION_NUMBER_PREFIX_RE = /^(?:Frage\s*)?(\d{1,3})[.):]\s*/i;

/**
 * Splits a large multi-question paste into individual questions. Built for
 * the "question / A / text / B / text / … / ✓ or ✗ / Correct Answer / X /
 * Explanation / text" export format, but tolerant of an inline "A) text"
 * style and of a missing explanation or missing correct-answer marker.
 *
 * Never invents a correct answer or an option: if the parser can't find a
 * correct-answer marker, `correctAnswerUnknown` is set to true and the
 * question must go through manual review before it can be enriched or
 * practiced.
 */
export function parseQuestionPaste(rawText: string): ParsedQuestion[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    // 1. Question text — a line that isn't itself an option label line.
    let questionLine = lines[i];
    if (OPTION_LABEL_ONLY_RE.test(questionLine) || OPTION_LABEL_INLINE_RE.test(questionLine)) {
      // Malformed paste (option line with no preceding question text) — skip it defensively.
      i++;
      continue;
    }
    i++;

    let questionNumber: string | null = null;
    const numberMatch = questionLine.match(QUESTION_NUMBER_PREFIX_RE);
    if (numberMatch) {
      questionNumber = numberMatch[1];
      questionLine = questionLine.slice(numberMatch[0].length);
    }

    // 2. Answer options: either two-line ("A" then text) or one-line ("A) text").
    const options: ParsedOption[] = [];
    while (i < lines.length) {
      const inlineMatch = lines[i].match(OPTION_LABEL_INLINE_RE);
      const onlyMatch = lines[i].match(OPTION_LABEL_ONLY_RE);
      if (inlineMatch) {
        options.push({ label: inlineMatch[1], text: inlineMatch[2], isCorrect: null });
        i++;
      } else if (onlyMatch) {
        const label = onlyMatch[1];
        i++;
        if (i < lines.length && !OPTION_LABEL_ONLY_RE.test(lines[i]) && !OPTION_LABEL_INLINE_RE.test(lines[i])) {
          options.push({ label, text: lines[i], isCorrect: null });
          i++;
        } else {
          // Label with no text at all — still record it as empty rather than lose the slot.
          options.push({ label, text: "", isCorrect: null });
        }
      } else {
        break;
      }
    }

    // 3. Optional previous-attempt markers ("✓" / "✗" / "Correct!Your answer: X") — not needed, just skipped.
    while (i < lines.length && (CHECK_MARK_RE.test(lines[i]) || RESULT_MARKER_RE.test(lines[i]))) {
      i++;
    }

    // 4. Correct-answer marker.
    let correctLabel: string | null = null;
    if (i < lines.length) {
      const inlineCorrect = lines[i].match(CORRECT_ANSWER_LABEL_LINE_RE);
      if (inlineCorrect) {
        i++;
        if (inlineCorrect[1]) {
          correctLabel = inlineCorrect[1];
        } else if (i < lines.length && /^[A-H]$/.test(lines[i])) {
          correctLabel = lines[i];
          i++;
        }
      }
    }

    if (correctLabel) {
      for (const opt of options) {
        opt.isCorrect = opt.label === correctLabel;
      }
    }

    // 5. Optional explanation block: "Explanation" label, then lines until the next
    // question starts. A new question is assumed to start at the next line ending in
    // "?" — explanations in this dataset are statements, not questions.
    let sourceExplanation: string | null = null;
    if (i < lines.length && /^(Explanation|Erklärung)$/i.test(lines[i])) {
      i++;
      const explanationLines: string[] = [];
      while (i < lines.length && !lines[i].endsWith("?")) {
        explanationLines.push(lines[i]);
        i++;
      }
      if (explanationLines.length > 0) {
        sourceExplanation = explanationLines.join(" ");
      }
    }

    if (questionLine.length > 0 && options.length >= 2) {
      results.push({
        questionNumber,
        questionText: questionLine,
        options,
        correctAnswerUnknown: correctLabel === null,
        sourceExplanation,
        category: null,
        source: null,
      });
    }
  }

  return results;
}
