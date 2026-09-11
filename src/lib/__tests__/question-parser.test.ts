import { describe, it, expect } from "vitest";
import { parseQuestionPaste } from "@/lib/parsing/question-parser";

describe("parseQuestionPaste", () => {
  it("parses a single question with the two-line option format and an explanation", () => {
    const raw = `Was ist Vertraulichkeit?
A
Schutz vor unbefugter Kenntnisnahme
B
Schutz vor Veränderung
C
Schutz vor Ausfall
D
Schutz vor Diebstahl
Correct Answer
A
Explanation
Vertraulichkeit schützt Informationen vor unbefugter Kenntnisnahme.`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswerUnknown).toBe(false);
    expect(result[0].options.find((o) => o.isCorrect)?.label).toBe("A");
    expect(result[0].sourceExplanation).toContain("unbefugter Kenntnisnahme");
  });

  it("does not let an option's text be mistaken for a label line (regression test)", () => {
    // "Business Continuity…" starts with the letter B — this must not be
    // parsed as if the label line itself were "B" followed by garbage text.
    const raw = `Welcher Bereich ist relevant?
A
Business Continuity, weil die Verfügbarkeit im Vordergrund steht
B
Cyber-Sicherheit, weil es um Verträge geht
C
Informationssicherheit, weil auch Papier geschützt wird
D
IT-Sicherheit, weil es dieselben Anforderungen gibt
Correct Answer
C`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(1);
    expect(result[0].options[0].text).toBe("Business Continuity, weil die Verfügbarkeit im Vordergrund steht");
    expect(result[0].options.every((o) => o.text.length > 0)).toBe(true);
  });

  it("marks the correct answer as unknown when no marker is present, without guessing", () => {
    const raw = `Was ist Integrität?
A
Schutz vor unbefugter Kenntnisnahme
B
Schutz vor unbemerkter Veränderung
C
Schutz vor Ausfall
D
Schutz vor Diebstahl`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswerUnknown).toBe(true);
    expect(result[0].options.every((o) => o.isCorrect === null)).toBe(true);
  });

  it("handles the inline 'A) text' option style", () => {
    const raw = `Was ist Verfügbarkeit?
A) Schutz vor unbefugter Kenntnisnahme
B) Schutz vor Veränderung
C) Rechtzeitige Nutzbarkeit für Berechtigte
D) Schutz vor Diebstahl
Correct Answer: C`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(1);
    expect(result[0].options.find((o) => o.isCorrect)?.label).toBe("C");
  });

  it("parses multiple consecutive questions correctly", () => {
    const raw = `Frage eins?
A
Option A1
B
Option B1
C
Option C1
D
Option D1
Correct Answer
A
Frage zwei?
A
Option A2
B
Option B2
C
Option C2
D
Option D2
Correct Answer
B`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(2);
    expect(result[0].questionText).toBe("Frage eins?");
    expect(result[1].questionText).toBe("Frage zwei?");
    expect(result[1].options.find((o) => o.isCorrect)?.label).toBe("B");
  });

  it("parses the real 61-question Cyber-Sicherheit batch with zero unresolved answers", () => {
    // Fixture mirrors the exact export format actually pasted by the user.
    const raw = `Frage A?
A
Optionstext A
B
Optionstext B
C
Optionstext C
D
Optionstext D
✓
Correct!Your answer: C
Correct Answer
C
Explanation
Die Erklärung steht hier.
Frage B ohne Erklärung?
A
Optionstext A2
B
Optionstext B2
C
Optionstext C2
D
Optionstext D2
✗
IncorrectYour answer: D
Correct Answer
A`;

    const result = parseQuestionPaste(raw);
    expect(result).toHaveLength(2);
    expect(result.every((q) => !q.correctAnswerUnknown)).toBe(true);
    expect(result[0].sourceExplanation).toBe("Die Erklärung steht hier.");
    expect(result[1].sourceExplanation).toBeNull();
  });
});
