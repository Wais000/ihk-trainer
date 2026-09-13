/**
 * Hard-coded content for the public landing page's interactive demos (see
 * src/components/landing/*). Deliberately static — the landing page must
 * render for a logged-out visitor against an empty database, so this is a
 * fixed excerpt of real seed-question wording, not a live query.
 *
 * The question/options/explanation below are the same wording as the real
 * seeded "Schutzziele" question the app ships with (see
 * supabase/seed/cyber-security-grundlagen-raw.txt and
 * supabase/seed/question-enrichment/results/batch-001.json's enrichment
 * format: summary / whyCorrect / commonTrap).
 */
import type { ExplanationLanguage } from "@/lib/validation/question";

export type DemoOptionLabel = "A" | "B" | "C" | "D";

export interface DemoOption {
  label: DemoOptionLabel;
  text: string;
}

export interface DemoGlossaryEntry {
  word: string;
  en: string;
  dari: string;
  he: string;
  /** A one-sentence plain-German gloss of the term in this context. */
  gloss: string;
}

export interface DemoExplanationBlock {
  summary: string;
  whyCorrect: string;
  commonTrap: string;
}

export const DEMO_QUESTION_TEXT =
  "Ein freigegebener Überweisungsdatensatz bleibt jederzeit verfügbar und nur für Berechtigte lesbar, wird aber unbemerkt verändert. Welches Schutzziel ist primär betroffen?";

export const DEMO_TOPIC_LABEL = "Compliance und Informationssicherheit";
export const DEMO_QUESTION_NUMBER = 3;
export const DEMO_QUESTION_TOTAL = 40;

export const DEMO_OPTIONS: DemoOption[] = [
  {
    label: "A",
    text: "Authentizität, weil die Erreichbarkeit des freigegebenen Datensatzes nicht nachgewiesen ist",
  },
  {
    label: "B",
    text: "Verfügbarkeit, weil eine veränderte Information fachlich nicht mehr wie vorgesehen nutzbar ist",
  },
  {
    label: "C",
    text: "Integrität, weil Richtigkeit und Unverändertheit des Datensatzes nicht gewährleistet sind",
  },
  {
    label: "D",
    text: "Vertraulichkeit, weil eine unautorisierte Veränderung zugleich eine Offenlegung voraussetzt",
  },
];

export const DEMO_CORRECT_LABEL: DemoOptionLabel = "C";

export const DEMO_GLOSSARY: DemoGlossaryEntry[] = [
  {
    word: "freigegeben",
    en: "released / approved",
    dari: "تایید شده",
    he: "מאושר",
    gloss: "Formell geprüft und zur Nutzung zugelassen.",
  },
  {
    word: "Überweisungsdatensatz",
    en: "bank transfer record",
    dari: "سند انتقال پول",
    he: "רשומת העברה בנקאית",
    gloss: "Die gespeicherten Angaben zu einer Bank-Überweisung.",
  },
  {
    word: "verfügbar",
    en: "available",
    dari: "در دسترس",
    he: "זמין",
    gloss: "Nutzbar, wenn eine berechtigte Person darauf zugreifen will.",
  },
  {
    word: "Berechtigte",
    en: "authorized persons",
    dari: "افراد مجاز",
    he: "מורשים",
    gloss: "Personen, die die Erlaubnis haben, diese Information zu sehen.",
  },
  {
    word: "unbemerkt",
    en: "unnoticed",
    dari: "بدون توجه کسی",
    he: "מבלי שאף אחד שם לב",
    gloss: "Ohne dass jemand es bemerkt oder meldet.",
  },
  {
    word: "Schutzziel",
    en: "protection goal",
    dari: "هدف حفاظتی",
    he: "יעד הגנה",
    gloss: "Eines der grundlegenden Ziele der Informationssicherheit (z. B. Vertraulichkeit, Integrität, Verfügbarkeit).",
  },
];

export const DEMO_EXPLANATION: Record<ExplanationLanguage, DemoExplanationBlock> = {
  de: {
    summary:
      "Die Frage prüft, welches Schutzziel verletzt ist, wenn ein Datensatz zwar jederzeit verfügbar und nur für Berechtigte lesbar bleibt, inhaltlich aber unbemerkt verändert wird.",
    whyCorrect:
      "Integrität bedeutet, dass Daten korrekt und unverändert bleiben. Da der Datensatz unbemerkt verändert wurde, ist genau das nicht mehr gewährleistet — unabhängig davon, dass er weiterhin verfügbar und vor unbefugtem Lesen geschützt ist.",
    commonTrap:
      "„Jederzeit verfügbar“ lenkt den Blick auf Verfügbarkeit, obwohl der Satz sie ausdrücklich bestätigt. Die eigentliche Verletzung liegt in der unbemerkten Veränderung, also bei der Integrität.",
  },
  en: {
    summary:
      "The question asks which protection goal is broken when a record stays available at all times and readable only by authorized people, but its content is silently altered.",
    whyCorrect:
      "Integrity means data stays correct and unchanged. Since the record was altered without anyone noticing, that is exactly what fails here — regardless of the fact that it's still available and still protected from unauthorized reading.",
    commonTrap:
      "\"Available at all times\" tempts you toward availability, even though the sentence explicitly confirms it's fine. The actual violation is the unnoticed change — that's integrity.",
  },
  dari: {
    summary:
      "این سوال می‌پرسد که وقتی یک سند همیشه در دسترس است و فقط افراد مجاز می‌توانند آن را بخوانند، اما محتوای آن بدون توجه کسی تغییر می‌کند، کدام هدف حفاظتی نقض شده است.",
    whyCorrect:
      "یکپارچگی یعنی داده‌ها درست و بدون تغییر باقی بمانند. چون این سند بدون توجه کسی تغییر کرده، دقیقاً همین موضوع نقض شده - صرف‌نظر از اینکه سند همچنان در دسترس است و از خواندن غیرمجاز هم محافظت می‌شود.",
    commonTrap:
      "عبارت «همیشه در دسترس» توجه را به سمت در دسترس بودن می‌برد، در حالی که جمله همین را تأیید می‌کند. مشکل واقعی، تغییر بدون توجه است - یعنی یکپارچگی.",
  },
  he: {
    summary:
      "השאלה בוחנת איזה יעד הגנה מופר כאשר רשומה נשארת זמינה בכל עת וניתנת לקריאה רק על ידי מורשים, אך תוכנה משתנה מבלי שאיש שם לב.",
    whyCorrect:
      "שלמות (Integrität) פירושה שהנתונים נשארים נכונים וללא שינוי. מכיוון שהרשומה שונתה מבלי שאיש הבחין בכך, זהו בדיוק מה שנפגע כאן — בלי קשר לעובדה שהיא עדיין זמינה ועדיין מוגנת מפני קריאה בלתי מורשית.",
    commonTrap:
      "הביטוי \"זמינה בכל עת\" מושך את תשומת הלב לזמינות, אף שהמשפט מאשר אותה במפורש. ההפרה בפועל היא השינוי שלא הבחינו בו — כלומר שלמות.",
  },
};

export interface DemoTopicItem {
  label: string;
}

export interface DemoTopic {
  title: string;
  blurb: string;
  items: DemoTopicItem[];
}

export const DEMO_TOPICS: DemoTopic[] = [
  {
    title: "Cyber Security – Grundlagen, Begriffe und Bedeutung",
    blurb:
      "The vocabulary the rest of the exam is built on: what counts as a threat, what counts as a vulnerability, and which protection goal a given incident actually breaks.",
    items: [
      { label: "Schutzziele — Vertraulichkeit, Integrität, Verfügbarkeit" },
      { label: "Bedrohung, Schwachstelle, Gefährdung, Risiko" },
      { label: "Informationssicherheit vs. IT-Sicherheit" },
      { label: "Informationssicherheit vs. Datenschutz" },
      { label: "Sicherheit und Schutz" },
      { label: "Authentizität und Nachweisbarkeit" },
      { label: "Business Continuity" },
    ],
  },
  {
    title: "Prozesse",
    blurb:
      "How security work is organised day to day — who decides, who documents, and what has to happen after something goes wrong.",
    items: [
      { label: "Rollen und Verantwortlichkeiten" },
      { label: "Incident- und Meldeprozesse" },
      { label: "Change-Management" },
      { label: "Dokumentation und Nachweise" },
      { label: "Schulung und Sensibilisierung" },
      { label: "Kontinuierliche Verbesserung" },
    ],
  },
  {
    title: "Rechtliche Anforderungen und Standards",
    blurb:
      "The paperwork half of the exam: which norm demands what, what an audit can actually check, and where the legal duties begin.",
    items: [
      { label: "ISO/IEC 27001 — Anforderungsnorm" },
      { label: "ISO/IEC 27002 — Leitfaden" },
      { label: "ISMS und Zertifizierung" },
      { label: "Risikobewertung und Risikobehandlung" },
      { label: "Technisch-organisatorische Maßnahmen" },
      { label: "DSGVO — Grundsätze" },
      { label: "Aufbewahrung und Löschung" },
    ],
  },
];

/** The single demo question shown in the exam-mode simulator — deliberately
 * different from DEMO_QUESTION_TEXT so the two demos don't look identical. */
export const EXAM_DEMO_QUESTION = {
  text: "Welche Aussage beschreibt das Verhältnis von Sicherheit und Schutz am sinnvollsten?",
  options: [
    { label: "A" as const, text: "Sicherheit und Schutz sind stets identisch und austauschbar" },
    { label: "B" as const, text: "Schutz ist immer umfassender als Sicherheit" },
    { label: "C" as const, text: "Sicherheit ist ein subjektives Gefühl, Schutz ein objektiver Zustand" },
    {
      label: "D" as const,
      text: "Schutz beschreibt konkrete Maßnahmen; Sicherheit ist das dadurch angestrebte Ergebnis",
    },
  ],
  correctLabel: "D" as const,
};

export const WEAKEST_TOPIC_LABEL = "Cyber Security – Grundlagen, Begriffe und Bedeutung";
