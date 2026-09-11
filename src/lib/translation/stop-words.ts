/**
 * German function words (articles, prepositions, conjunctions, pronouns,
 * auxiliary/modal verb forms, filler adverbs) — these carry no independent
 * lexical meaning on their own, so they're excluded from word-level
 * translation even though they're longer than the 2-character cutoff.
 */
const GERMAN_STOP_WORDS = new Set([
  // articles
  "der", "die", "das", "des", "dem", "den", "ein", "eine", "einer", "eines", "einem", "einen",
  // prepositions
  "in", "im", "an", "am", "auf", "aus", "bei", "beim", "bis", "durch", "für", "gegen", "mit",
  "nach", "ohne", "seit", "um", "unter", "über", "von", "vom", "vor", "während", "wegen", "zu",
  "zum", "zur", "zwischen", "innerhalb", "außerhalb", "entlang", "gemäß", "laut", "trotz",
  // conjunctions
  "und", "oder", "aber", "doch", "sondern", "denn", "weil", "dass", "ob", "wenn", "als",
  "obwohl", "bevor", "nachdem", "damit", "sowie", "sowohl", "weder", "noch",
  // pronouns
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mich", "dich", "ihn", "uns", "euch", "ihnen",
  "mein", "dein", "sein", "ihre", "unser", "euer", "dieser", "diese", "dieses", "jener", "jene",
  "jenes", "welcher", "welche", "welches", "man", "jemand", "niemand", "etwas", "nichts",
  "alle", "alles", "jeder", "jede", "jedes",
  // auxiliary / modal / copula verb forms
  "ist", "sind", "war", "waren", "wird", "werden", "wurde", "wurden", "worden", "habe", "hast",
  "hat", "haben", "hatte", "hatten", "kann", "kannst", "können", "konnte", "konnten", "muss",
  "musst", "müssen", "musste", "mussten", "soll", "sollst", "sollen", "sollte", "sollten",
  "darf", "darfst", "dürfen", "durfte", "durften", "will", "willst", "wollen", "wollte",
  "wollten", "mag", "magst", "mögen", "möchte", "möchten",
  // filler adverbs/particles with no standalone lexical content worth a translation lookup
  "nicht", "auch", "nur", "schon", "noch", "sehr", "so", "dann", "also", "zwar", "ja", "nein",
  "hier", "dort", "da",
]);

/** Whether a word is meaningful enough to offer for translation (content word, not a function word). */
export function isTranslatableWord(word: string): boolean {
  return word.length > 2 && !GERMAN_STOP_WORDS.has(word.toLowerCase());
}
