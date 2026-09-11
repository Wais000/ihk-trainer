import { describe, it, expect } from "vitest";
import { normalizeQuestionText, textSimilarity, findLikelyDuplicate } from "@/lib/parsing/duplicate-detection";

describe("normalizeQuestionText", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    expect(normalizeQuestionText("Was ist   Vertraulichkeit?!")).toBe("was ist vertraulichkeit");
  });
});

describe("textSimilarity", () => {
  it("returns 1 for identical normalized text", () => {
    const a = normalizeQuestionText("Was ist Vertraulichkeit in der IT-Sicherheit?");
    expect(textSimilarity(a, a)).toBe(1);
  });

  it("returns a low score for unrelated questions", () => {
    const a = normalizeQuestionText("Was ist Vertraulichkeit?");
    const b = normalizeQuestionText("Wie funktioniert ein Backup-Konzept in der Cloud?");
    expect(textSimilarity(a, b)).toBeLessThan(0.3);
  });

  it("returns a high score for near-identical rephrasings", () => {
    const a = normalizeQuestionText("Ein unberechtigter Dritter liest vertrauliche Angebotsunterlagen. Welches Schutzziel ist verletzt?");
    const b = normalizeQuestionText("Ein unberechtigter Dritter liest vertrauliche Angebotsunterlagen. Welches Schutzziel ist unmittelbar verletzt?");
    expect(textSimilarity(a, b)).toBeGreaterThan(0.82);
  });
});

describe("findLikelyDuplicate", () => {
  it("finds the matching candidate above the threshold", () => {
    const existing = [
      { id: "1", questionTextNormalized: normalizeQuestionText("Was ist Vertraulichkeit in der Informationssicherheit?") },
      { id: "2", questionTextNormalized: normalizeQuestionText("Wie funktioniert Verschlüsselung?") },
    ];
    const incoming = normalizeQuestionText("Was ist Vertraulichkeit in der Informationssicherheit genau?");
    const match = findLikelyDuplicate(incoming, existing);
    expect(match?.id).toBe("1");
  });

  it("returns null when nothing is similar enough", () => {
    const existing = [{ id: "1", questionTextNormalized: normalizeQuestionText("Wie funktioniert Verschlüsselung?") }];
    const incoming = normalizeQuestionText("Was ist ein Notfallplan im Business Continuity Management?");
    expect(findLikelyDuplicate(incoming, existing)).toBeNull();
  });
});
