# Handoff: IHK Exam Trainer — public landing page

## Overview

A public, pre-signup landing page for **IHK Exam Trainer**. Its job: a visitor who
has never used the app understands every feature *and how it works* before creating
an account, and can actually try the product on the page — one real exam question
with live word translation, a live spaced-repetition simulator, and a live exam-mode
simulator with a running clock.

It replaces the current stub landing page (`src/app/page.tsx`, which today renders
`dict.auth.appName` + `dict.auth.landingIntro` + two buttons).

The page's argument, in order: the exam is in German → the bottleneck for many
trainees is vocabulary, not subject knowledge → tap-to-translate removes that
bottleneck → here is proof, try it → and here is everything else the app does.

## About the design files

`design-reference/` contains a **design reference created in HTML**, not production
code:

- `IHK Trainer Landing.dc.html` — the prototype. It is a single-file streaming
  "Design Component": markup inside `<x-dc>`, a `class Component extends DCLogic`
  script holding all interactive state, and `{{ }}` template holes. It runs through
  `support.js`. **Do not port this file or its runtime into the app.**
- `broadsheet-tokens.css` — the design system the prototype is styled from
  (Broadsheet). Read it for exact token values; do not link it into the app.
- `support.js` — the prototype runtime, included only so the HTML opens in a browser.

**The task is to rebuild this page inside the existing Next.js app** using its own
conventions: App Router, React 19 server components, Tailwind v4 with the tokens in
`src/app/globals.css`, the `src/components/ui/*` primitives (`Button`, `Card`,
`Badge`, `Input`, `Dialog`), `lucide-react` icons, and the `getUiDict()` /
`dict.*` i18n pattern. Lift the *layout, copy, behaviour and interaction* from the
prototype; take *styling* from whichever of the two options in "Visual direction"
below the team picks.

## Fidelity

**High-fidelity.** Copy, hierarchy, spacing rhythm, interaction states and all
behaviour are final and intentional. Type sizes, colours and the serif voice are
exact *for the Broadsheet design system the prototype is set in* — see "Visual
direction" for how much of that to carry into the app.

## Visual direction — decide this first

The prototype is set in **Broadsheet**: paper-white ground, Source Serif 4 for
everything (headings *and* body, no sans anywhere), near-black ink, cyan as the
single interactive accent, magenta as a rare second spot colour, no cards or rules
used as layout structure — hierarchy comes from type scale and whitespace only.

The app itself is a different look: Geist sans, `#f0f4f8` background, `#2563eb`
primary, shadcn-style cards and borders.

Two legitimate choices:

1. **Marketing page keeps Broadsheet** (what the prototype shows). Scope its tokens
   to the landing route only — add the `:root` block from `broadsheet-tokens.css`
   under a `[data-surface="landing"]` wrapper or in a route-group layout, load
   Source Serif 4 via `next/font/google`, and build the page's own presentational
   components rather than reusing `src/components/ui/*` (whose styling is app-theme
   bound). The in-page product demos then look like the prototype, not like the app.
2. **Marketing page adopts the app theme** — same structure, copy and behaviour,
   restyled with `--primary`, `--card`, `--border`, Geist, and the existing `Button`
   / `Card` / `Badge`. The demos then look exactly like the real product, which is
   arguably the stronger sales argument.

Everything else in this document holds for either choice. Where a value below is
Broadsheet-specific it is marked **(BS)**.

## Route and file plan

```
src/app/page.tsx                                  server component — the page, all static copy
src/app/(marketing)/…                             optional route group if you scope landing-only styling
src/components/landing/try-question-demo.tsx       "use client" — question + tap-to-translate + explanation
src/components/landing/review-ladder-demo.tsx      "use client" — spaced-repetition simulator
src/components/landing/exam-mode-demo.tsx          "use client" — timed exam simulator
src/components/landing/topic-tabs.tsx              "use client" — topic category tabs
src/lib/landing/demo-content.ts                    demo question, word glossary, explanations, topic lists
```

Notes:

- `src/app/page.tsx` stays a **server component**; only the four demo islands are
  `"use client"`. No data fetching, no Supabase, no auth on this page.
- The demos must **not** write to the database, `sessionStorage`, or the activity
  log. They are pure local state, and the page says so in copy ("Nothing here is
  recorded").
- The demo content in `src/lib/landing/demo-content.ts` is a hard-coded excerpt.
  Reuse the real seed question wording (it comes from
  `supabase/seed/cyber-security-grundlagen-raw.txt` and
  `supabase/seed/question-enrichment/results/batch-001.json`) but do not query the
  live `questions` table — the page must work for a logged-out visitor with an empty
  database.
- All visible copy is English in the prototype. The page is the app's public front
  door and the app already has a four-language UI dictionary
  (`src/lib/i18n/ui/{en,de,dari,he}.ts`). Add a `landing` section to `en.ts` with
  the keys for every string below and run
  `scripts/generate-ui-translations.ts` so `de` / `dari` / `he` follow. The German
  question text, options and German explanation are **content, not UI chrome** —
  they stay German in every locale, exactly like the app's questions do.

## Page structure, in order

Container: `max-width: 1180px`, centred, horizontal padding
`clamp(20px, 5vw, 72px)`. Section vertical padding `56px 0` unless noted. The page
is fluid — no fixed widths; every grid uses
`repeat(auto-fit, minmax(<min>, 1fr))` so it collapses to one column on a phone.

### 1. Header

- `src/components/ui/*`-agnostic bar: brand wordmark left ("IHK Exam Trainer",
  heading font, 18px, weight 600), then anchor links, then a primary CTA button.
- Links: `Try it` → `#try`, `Topics` → `#topics`, `Translation` → `#translation`,
  `Exam mode` → `#exam`. 14px.
- CTA: `Get started` → `/auth/register`.
- Anchors scroll smoothly (`html { scroll-behavior: smooth }`, disabled under
  `prefers-reduced-motion`).
- Horizontal padding aligns the bar's contents to the page text axis:
  `max(clamp(20px,5vw,72px), calc((100% - 1180px) / 2 + clamp(20px,5vw,72px)))`.
- Below 480px, hide the section links and keep brand + CTA.

### 2. Hero — centred

- H1, two lines, `font-size: clamp(38px, 5.6vw, 74px)`, `line-height: 1.07`,
  `letter-spacing: -0.02em`, `max-width: 20ch`, centred:
  - line 1 — "Learn the exam,"
  - line 2 — "not the dictionary."
  - **(BS)** line 1 is printed as four misregistered process plates via the
    `.cmyk-head` construction (a `.paper` span carrying the real text plus three
    `aria-hidden` `.plate plate-c/-m/-y` repeats). If you drop Broadsheet, drop this
    and set the line in plain ink.
- Sub, 18px / 30px, `max-width: 56ch`, centred, ink at 80%:
  > "Real IHK multiple-choice questions, in the German they are printed in — with
  > every hard word one tap from your own language. Other trainers hand you the
  > questions. This one hands you the words too, so the hour you spend goes on the
  > subject instead of the dictionary."
- Two buttons, centred, `min-height: 44px`, `padding-inline: 20px`:
  - primary "I'm taking the exam" → `/auth/register`
  - secondary "I'm a trainer" → `#trainers`
- Fine print, 14px, ink 65%: "Free account · bring your own question bank · nothing
  to install".

### 3. Proof strip — three figures

`repeat(auto-fit, minmax(200px, 1fr))`, each item centred: a 48px display figure
over a 15px / 24px caption (ink 72%).

| Figure | Caption |
| --- | --- |
| `40 / 60` | Questions and minutes in a mock exam — the real format, the real clock |
| `4` | Languages for words, explanations and menus — Deutsch, English, فارسی, עברית |
| `5` | Numbers in the whole review algorithm — 0, 1, 3, 7, 14 days. No black box |

These are the app's real constants: `EXAM_QUESTION_COUNT = 40` and
`EXAM_DURATION_SECONDS = 3600` from `src/lib/exam/constants.ts`, the four
`LANGUAGE_LABELS` in `src/lib/i18n/languages.ts`, and
`INTERVAL_BY_STREAK_DAYS = [0, 1, 3, 7, 14]` from `src/lib/srs/schedule.ts`. If any
constant changes, this strip must change with it — consider importing them rather
than hard-coding. **(BS)** the figures use the `.cmyk-num` plate treatment.

### 4. `#try` — the interactive lesson (the centrepiece)

Heading, `clamp(28px, 3.6vw, 44px)`, `max-width: 26ch`: "Try a real question. Tap
the words you don't know." Intro, 16px / 28px, `max-width: 62ch`:

> "This is an actual question from the bank, untouched. The underlined words are
> live — tap one and you get its meaning plus a plain-German gloss. Nothing here is
> recorded, and you don't need an account to poke at it."

Then a language segmented control labelled "Translate into" —
`English` / `فارسی` / `עברית` — and a two-column grid
(`repeat(auto-fit, minmax(320px, 1fr))`, gap `24px clamp(24px,4vw,56px)`,
`align-items: start`).

**Left column — the question card** (surface fill, radius 2px, 24px padding,
`--shadow-sm`):

- Card head row: topic label "Compliance und Informationssicherheit" (12px, uppercase,
  `letter-spacing: 0.08em`, ink 65%) and a neutral badge "Question 3 of 40".
- Question paragraph, 17px / 32px, German, with tappable words:

  > "Ein freigegebener Überweisungsdatensatz bleibt jederzeit verfügbar und nur für
  > Berechtigte lesbar, wird aber unbemerkt verändert. Welches Schutzziel ist primär
  > betroffen?"

  Tokenise on whitespace, strip `.,?!»«„“”"` when looking a token up in the
  glossary. A word in the glossary gets `cursor: pointer` and a 1px dotted accent
  underline; the open word also gets an `--color-accent-200` background. Tapping the
  open word closes it (toggle). Words must be real buttons or have
  `role="button"` + keyboard activation — see "Accessibility".
- Word panel (only while a word is open), inset card on the page ground:
  German word (heading font, 18px, weight 600), a "Close" ghost button, the
  translation (18px / 28px, accent-700, `dir="rtl"` for فارسی and עברית), the
  plain-German gloss (14px / 24px, ink 72%), and a 13px note "Saved to your
  vocabulary list in the app." (true of the real app, not of this demo).
- Four options, stacked, 8px gap. Each is a full-width `<button>`:
  `display: flex; gap: 10px; align-items: flex-start; text-align: left;`
  14.5px / 22px, `padding: 11px 12px`, radius 2px, page-ground fill, 1px divider
  border, with a bold letter (A–D, `min-width: 1.2em`) then the option text.
  Option copy (German, verbatim):
  - A — "Authentizität, weil die Erreichbarkeit des freigegebenen Datensatzes nicht nachgewiesen ist"
  - B — "Verfügbarkeit, weil eine veränderte Information fachlich nicht mehr wie vorgesehen nutzbar ist"
  - C — "Integrität, weil Richtigkeit und Unverändertheit des Datensatzes nicht gewährleistet sind" ← correct
  - D — "Vertraulichkeit, weil eine unautorisierte Veränderung zugleich eine Offenlegung voraussetzt"
- Action row: primary "Confirm" (`min-height: 44px`), secondary "Show answer"
  (`min-height: 44px`), then a 15px verdict string (ink 72%).
- Footnote, 13px, ink 62%: "In the app: 1–4 picks an option, Enter confirms, N is
  next, T toggles translation." (matches `src/components/practice/shortcut-help.tsx`.)

**Right column — before/after**

- Before confirming: kicker "What happens after you confirm" + two paragraphs
  (16px / 28px, ink 80%):
  > "The question opens up: what it tests, why the right answer is right, why each
  > wrong option fails, and the trap the examiner laid — in German first, because
  > that is the wording you'll meet, with your language one tap away."

  > "Answer it and see for yourself."
- After confirming (or after "Show answer"): a `Deutsch` / `<second language>`
  segmented control, then the explanation, mirroring
  `src/components/questions/explanation-view.tsx`'s four parts:
  - "Richtige Antwort — C" (12px uppercase, accent-700)
  - body, 16px / 28px — "Die unbemerkte Veränderung betrifft die Richtigkeit und
    Unversehrtheit der Information und damit ihre **Integrität**. Verfügbarkeit und
    Vertraulichkeit sind im Fall ausdrücklich weiterhin gegeben."
  - "Warum die anderen falsch sind" (12px uppercase, ink 65%) + 15.5px / 28px —
    "A verwechselt Authentizität mit Erreichbarkeit. B beschreibt eine Folge, nicht
    das verletzte Schutzziel. D setzt voraus, dass eine Veränderung immer eine
    Offenlegung bedingt — das ist nicht der Fall."
  - "Häufige Falle: " (magenta-700 inline label) + "„jederzeit verfügbar" zieht den
    Blick auf Verfügbarkeit, obwohl der Satz sie gerade bestätigt."
  - The second-language tab shows the same four parts translated, and sets
    `dir="rtl"` on its wrapper for فارسی / עברית. The English, Dari and Hebrew
    strings are in the prototype's `EXPL` map — copy them verbatim; they were
    written against `batch-001.json`'s enrichment format
    (`summary` / `whyCorrect` / `commonTrap`).

### 5. `#translation` — "Why this one is faster"

Kicker "Why this one is faster", heading `clamp(28px, 3.4vw, 42px)`, `max-width: 28ch`:
"Four things that cut the hours, not the standard". Then
`repeat(auto-fit, minmax(250px, 1fr))`, gap `42px clamp(28px,4vw,64px)`; each block
is a 23px / 30px heading over 15.5px / 28px body (ink 78%):

1. **Translation where you stumble** — "Tap a word for its meaning, or switch on full
   translation of the question, the options, the correct answer only, or the
   explanation — four independent switches, so you can wean yourself off one at a
   time." (These are the real four settings in
   `src/app/(app)/settings` / `PracticeSessionProps`.)
2. **Explanations, not verdicts** — "Every question carries the concept it tests, why
   the right option wins, why each distractor fails, and the common trap. Being told
   “wrong” teaches nothing; this is the part most trainers leave out."
3. **Repetition you can audit** — "Wrong answers come back in four hours — sooner if
   you keep missing them. Right answers step out to one, three, seven, fourteen
   days. You can hold the whole rule in your head."
4. **Your own question bank** — "Paste what your school or trainer actually uses. The
   importer parses every question, flags likely duplicates, and saves nothing until
   you confirm. No waiting for someone else's content update."

### 6. `#topics` — category tabs

Heading `clamp(28px, 3.4vw, 42px)`, `max-width: 24ch`: "From the sample bank to your
whole syllabus". Three pill tabs (`Cyber Security`, `Prozesse`,
`Recht und Standards`): 14.5px, `padding: 9px 16px`, radius 2px; the active one is
an accent fill with inverted text, the others transparent with a divider border.

Below, a two-column grid: left = the category's full title (26px / 34px), a
15.5px / 28px blurb (`max-width: 46ch`) and the 14px note "Practice a category on
its own, or let review mode mix them the way the exam does."; right = kicker
"Covered in this category" over the subtopic list in
`repeat(auto-fit, minmax(210px, 1fr))` — each row 15.5px / 32px with an accent
middot and a hairline bottom rule.

Content (grounded in `supabase/seed/question-enrichment/existing-topics.json` and the
`subtopic` values in the enrichment results):

- **Cyber Security — Grundlagen, Begriffe und Bedeutung** — blurb: "The vocabulary the
  rest of the exam is built on: what counts as a threat, what counts as a
  vulnerability, and which protection goal a given incident actually breaks."
  Items: Schutzziele — Vertraulichkeit, Integrität, Verfügbarkeit · Bedrohung,
  Schwachstelle, Gefährdung, Risiko · Informationssicherheit vs. IT-Sicherheit ·
  Informationssicherheit vs. Datenschutz · Sicherheit und Schutz · Authentizität und
  Nachweisbarkeit · Business Continuity
- **Prozesse** — blurb: "How security work is organised day to day — who decides, who
  documents, and what has to happen after something goes wrong." Items: Rollen und
  Verantwortlichkeiten · Incident- und Meldeprozesse · Change-Management ·
  Dokumentation und Nachweise · Schulung und Sensibilisierung · Kontinuierliche
  Verbesserung
- **Rechtliche Anforderungen und Standards** — blurb: "The paperwork half of the exam:
  which norm demands what, what an audit can actually check, and where the legal
  duties begin." Items: ISO/IEC 27001 — Anforderungsnorm · ISO/IEC 27002 — Leitfaden ·
  ISMS und Zertifizierung · Risikobewertung und Risikobehandlung ·
  Technisch-organisatorische Maßnahmen · DSGVO — Grundsätze · Aufbewahrung und Löschung

If you later want this list to reflect the real database, it can be generated at
build time from the seeded topics — but it must degrade to this static list when the
table is empty.

### 7. `#exam` — exam-mode simulator

Left: kicker "Exam mode", heading `clamp(26px, 3vw, 38px)` "The day itself,
rehearsed", two paragraphs (15.5px / 28px, `max-width: 46ch`):

> "Forty questions, sixty minutes, German only — translations, word taps and
> explanations all switched off, exactly as they will be. Jump around with the number
> grid, mark what you want to revisit, end when you're ready. Leave mid-exam and you
> can resume the same session."

> "Then: your score, your time, what you skipped, the topics with room for
> improvement, and one tap into reviewing those mistakes. Start it below — the clock
> is real."

Right: a card with three phases. Head row always shows a status label (12px
uppercase, ink 65%) and the clock (26px, heading font, `tabular-nums`).

- **idle** — clock reads `60:00`; body is the app's own exam description, verbatim
  from `dict.exam.description`: "A timed, German-only mock exam that hides hints and
  translations, so you get a realistic sense of your readiness."; primary button
  "Start exam" (`min-height: 44px`).
- **running** — status "Question {n} / 40 · {answered} answered". A
  `grid-template-columns: repeat(10, 1fr)` grid of 40 numbered cells, 4px gap, 12px
  `tabular-nums`, `padding: 7px 0`, radius 1px:
  - default: page ground, ink 70%, divider border
  - answered: `color-mix(in srgb, var(--color-text) 14%, transparent)` fill, full ink
  - marked for review: magenta border
  - current: accent fill, inverted text, accent border
  Then one German question — "Welche Aussage beschreibt das Verhältnis von Sicherheit
  und Schutz am sinnvollsten?" — with four options in the same button style as the
  `#try` card but 6px gaps (option D is the correct one; the demo never says so
  while running). Action row: secondary "Mark for review" / "Remove mark", ghost
  "End exam", and a 13px note "No feedback until you finish".
- **done** — status "Exam simulation result". Score line (heading font, 30px / 38px):
  `"{correct} of {answered} answered correctly"`, or `"0 of 40"` if nothing was
  answered. Breakdown (15.5px / 28px, ink 78%): `"Correct {c} · Incorrect {i} ·
  Skipped {s} · Duration {m:ss}. Weakest topic: Cyber Security — Grundlagen, Begriffe
  und Bedeutung."`, or, when nothing was answered, "You skipped all forty — the real
  thing is less forgiving. Duration {m:ss}." Then the app's real disclaimer (14px,
  ink 65%): "An estimate of your current performance — not a guarantee of passing the
  real IHK exam." Buttons: primary "Run it again", ghost "Back".

The clock counts **down** from 3600s in 1s ticks and auto-ends at zero. Clear the
interval on unmount and on "End exam". `Duration` is `3600 − remaining`, formatted
`m:ss` (so "3:07", not "03:07").

### 8. Review-ladder simulator

Demo left, copy right (the reverse of §7 — the alternation is deliberate).

Demo card: kicker "One question's schedule"; a five-bar chart in a 108px-tall flex
row, `align-items: flex-end`, 8px gap. Bar *i* is `26 + i × 17` px tall (26, 43, 60,
77, 94) with the label `today`, `1d`, `3d`, `7d`, `14d` (12px, `tabular-nums`) under
it. Bars `0…streak` are accent-filled with accent-700 labels; the rest are
`color-mix(in srgb, var(--color-text) 12%, transparent)` with ink-55% labels.

Below: a 26px / 34px headline and a 15px / 26px detail line, then primary "I got it
right", secondary "I got it wrong" (both `min-height: 44px`) and a ghost "Reset".

The simulator must be a faithful reimplementation of `computeNextReview()` in
`src/lib/srs/schedule.ts` — import and use that function rather than restating the
rule:

| State | Headline | Detail |
| --- | --- | --- |
| untouched | "Not answered yet" | "Answer once and the schedule starts. Nothing is due before you touch it." |
| streak 1 (0 days) | "Back later today" | "1 correct answer in a row. Keep going and the gap widens." |
| streak 2 (1 day) | "Back tomorrow" | "2 correct answers in a row. …" |
| streak 3–4 | "Back in 3 days" / "Back in 7 days" | same pattern |
| streak ≥ 5 | "Back in 14 days" | "Top of the ladder — fourteen days is the longest gap the app will ever leave." |
| 1 miss | "Back in 4 hours" | "One miss sends it to the bottom of the ladder: four hours, then it is due again." |
| n misses | "Back in 2 hours" / "1 hour" | "{n} misses in a row — the wait halves each time, with a floor of one hour." |

Copy right: kicker "Review", heading "Five numbers, and you can check the maths",
then:

> "Press the buttons and watch a question walk the ladder. Right answers push it
> out — same day, one, three, seven, fourteen days. A wrong answer drops it to the
> bottom: back in four hours, two if you miss it twice, one at the floor. That is the
> entire schedule, on purpose."

> "Your dashboard says how many are due, how far into today's goal you are, and which
> topics your recent answers say are weakest."

### 9. "On your own schedule" — copy + screenshot

Two columns, `align-items: center`. Left: kicker "On your own schedule", heading
"Twenty minutes on the train counts", two paragraphs:

> "Set your own daily goal — not ours. Walk away mid-session and it resumes on the
> question you left. Words you tapped are waiting in your vocabulary list, printable
> for the days you'd rather hold paper. Light, dark, or whatever your phone is doing."

> "And a reset that wipes every attempt if you want a clean run — without touching
> your questions, vocabulary or favourites."

Right: a 4:3 figure that is **a real screenshot of the practice screen**. In the
prototype this is an empty drop slot — see "Assets". **(BS)** the figure carries the
`.halftone` newsprint dot-screen treatment for interface imagery; drop that if you
drop Broadsheet.

### 10. `#trainers` — for trainers and Ausbilder

Kicker "For trainers and Ausbilder", heading "Your question set, your wording", and
two paragraphs (`max-width: 52ch`):

> "Paste the bank you already teach from. The importer parses each question, shows you
> what it found, flags possible duplicates, and waits for your confirmation before
> saving a thing. Explanations and vocabulary are prepared in bulk offline rather than
> invented live, so what your trainees read is what you approved — and the vocabulary
> sheets print."

> "Trainees with little German are not stuck waiting for their language skills to
> catch up with the syllabus: the interface itself speaks Deutsch, English, فارسی or
> עברית, right-to-left where that is how it is read."

Everything here is true of the shipped app today (bulk enrichment scripts, duplicate
detection, vocabulary print, four UI languages, RTL). **If any of it stops being
true, change this section** — it is the page's credibility.

### 11. Pull quote

A single italic serif quote, `clamp(24px, 2.6vw, 34px)` / 44px, `max-width: 36ch`,
with the opening `“` hung in the margin (`text-indent: -0.475em`; drop the hang below
720px where the gutter is narrower than the hang):

> "I knew the subject. I didn't know the sentence. Tapping the word was the whole
> difference."

Caption, 15.5px / 28px, ink 70%, em-dash hung (`text-indent: -1.045em`): "— the reason
this exists. Tell us whether it works for you."

**This is deliberately not attributed to a named person, because it is not a real
testimonial.** Do not turn it into one, and do not add invented testimonials with
invented names, roles or photos. When you have real quotes with permission, replace
this section with them.

### 12. `#start` — sign-up close

Heading `clamp(28px, 3.6vw, 46px)`, `max-width: 24ch`: "Everything above is free to
try with an account". Body 16px / 28px, `max-width: 56ch`:

> "An email, a password of at least eight characters, and a confirmation link. Start
> with the sample topics — cyber security, processes, legal requirements and
> standards — or paste your own bank in the first five minutes."

Then an email field (`flex: 1; min-width: 200px; min-height: 44px`) beside a primary
"Create a free account" in a 520px-max row that wraps on narrow screens, and a 14px
line: "Already have an account? [Sign in] — or [reset your password]."

Wire it up: the email input prefills the register form (e.g.
`/auth/register?email=…`, read in `src/app/auth/register/page.tsx`), the button goes
to `/auth/register`, "Sign in" to `/auth/login`, "reset your password" to
`/auth/reset-password`. The eight-character minimum is the real rule
(`dict.auth.minPasswordLength`, `dict.auth.passwordTooShort`) — keep the two in sync.

### 13. Footer

`repeat(auto-fit, minmax(180px, 1fr))`, 14px / 28px: the brand blurb ("Practice
questions, explanations and vocabulary in your language."), a **Product** column
(Try a question / Topics / Exam mode — in-page anchors), a **Languages** column
("Deutsch · English · فارسی · עברית"), an **Account** column (Create an account →
`/auth/register`, Sign in → `/auth/login`). Then a 13px, ink-62% line:

> "Readiness estimates are estimates, not promises. Not affiliated with any chamber of
> commerce."

Keep that second sentence. "IHK" is a real institution and the page must not imply an
endorsement.

## Interactions & behaviour

- **Word tap** — toggles the open word; opening a different word replaces the panel.
  No hover-open (the app's own instant translation is tap *or* hover; on this page,
  tap only, so touch and mouse behave identically).
- **Option pick** — selecting an option while a verdict is showing clears the verdict
  (`submitted → false`) so the visitor can try another answer freely.
- **Confirm** — only takes effect when an option is selected; otherwise it is a no-op.
  **Show answer** reveals the explanation with no option selected and the verdict
  reads "Answer shown" (same wording as `dict.practice.answerShown`).
- **Verdict strings** — "Pick an option" → "Now confirm it" → "Correct" /
  "Incorrect" / "Answer shown".
- **Option states** — picked: accent border + 1px inset accent ring. After confirm:
  the correct option turns accent border + `--color-accent-100` fill *always*; a
  wrong pick turns magenta border + `--color-accent-2-100` fill. Untouched options
  stay neutral.
- **Language switch** — changes the word panel, the explanation's second tab, and the
  `dir` of both. It does **not** translate the question or options (that is a paid-off
  distinction the page makes on purpose: the German stays German).
- **Explanation tabs** — always open on Deutsch, exactly like the real
  `ExplanationView`.
- **Topic tabs** — pure local index; no URL state needed.
- **Exam timer** — 1s interval, counts down, auto-ends at 0, cleared on unmount.
- **Transitions** — the app's `--transition: 0.2s var(--ease)` on colour/border
  changes is enough. No scroll-driven animation, no parallax, no reveal-on-scroll.
- **Responsive** — every grid is `auto-fit`/`minmax` and collapses to a single column;
  the 40-cell exam grid keeps 10 columns (cells shrink) down to ~340px. Nothing has a
  fixed height that holds text. All primary tap targets are ≥ 44px.

## State

Four independent client islands; no shared store, nothing persisted.

```ts
// try-question-demo
lang: "en" | "dari" | "he"        // default "en"
word: string | null               // open glossary word
pick: "A" | "B" | "C" | "D" | null
submitted: boolean
explSecond: boolean               // false = Deutsch tab

// topic-tabs
topic: 0 | 1 | 2

// review-ladder-demo
consecutiveCorrect: number
consecutiveWrong: number
last: "right" | "wrong" | null

// exam-mode-demo
phase: "idle" | "running" | "done"
secondsLeft: number               // 3600 at start
current: number                   // 1…40
answers: Record<number, "A"|"B"|"C"|"D">
marked: Record<number, boolean>
```

No data fetching. No server actions. No `sessionStorage` (unlike the real practice
session, which deliberately persists — the demo must not).

## Accessibility

- Tappable words must be real `<button>`s (or `role="button"` + `tabIndex={0}` +
  Enter/Space handling) with an accessible label naming the word, e.g.
  `aria-label="Translate “Schutzziel”"`. A dotted underline alone is not an
  affordance for keyboard or screen-reader users.
- The language and explanation segmented controls are native radio groups with visible
  labels (the prototype uses hidden `<input type="radio">` inside `<label>`); if you
  build them as buttons instead, use `role="tablist"` / `aria-selected`.
- The exam number grid: each cell is a button labelled
  `Question {n}{, answered}{, marked for review}`; the current cell carries
  `aria-current="true"`.
- The verdict line and the word panel should be `aria-live="polite"` so a screen
  reader announces the result of confirming.
- Keep `dir="rtl"` on the Dari/Hebrew blocks only — not on the whole page.
- Focus is the app's existing ring; **(BS)** Broadsheet's is
  `outline: 2px solid var(--color-accent); outline-offset: 2px`. Never the browser
  default.
- Contrast: all body copy is full-strength or ≥ 70% ink on the light ground (≥ 4.5:1).
  Accent-coloured *paragraph* text uses the 700 step, never the base accent (base
  cyan is a 3:1 colour — headline and chrome only). Keep that rule if you restyle.

## Design tokens (Broadsheet — see `design-reference/broadsheet-tokens.css`)

Colour

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#f3f2f2` | page ground |
| `--color-surface` | `#eae9e9` | demo cards |
| `--color-text` | `#201e1d` | ink |
| `--color-accent` | `#0088b0` | interactive, chrome, large figures |
| `--color-accent-700` | `#006786` | accent text at body size |
| `--color-accent-100 / -200` | `#e9f8ff` / `#cbeeff` | correct-answer fill, open-word highlight |
| `--color-accent-2` | `#d6006c` | second spot: marked cells, wrong-answer border |
| `--color-accent-2-100 / -700` | `#ffdee6` / `#aa0b56` | wrong-answer fill, "Häufige Falle" label |
| `--color-process-yellow` | `#edbb00` | print plates only, never text |
| `--color-divider` | `#201e1d` @ 16% | option borders, hairlines |

Muted ink is `color-mix(in srgb, var(--color-text) N%, transparent)` — N = 80 (hero
sub), 78 (body), 72 (captions), 70 (kickers), 65 (fine print), 62 (footnotes).

Type — **one family for everything**: Source Serif 4, 600 for headings, 400 body,
400 true italic for quotes (never synthesised oblique).

| Role | Size / line-height |
| --- | --- |
| H1 | `clamp(38px, 5.6vw, 74px)` / 1.07, `-0.02em` |
| H2 | `clamp(26–28px, 3–3.6vw, 38–46px)` / 1.08–1.12, `-0.015em` |
| H3 | 23–26px / 30–34px |
| Display figure | 48px (proof strip), 30px (score), 26px (clock, ladder headline) |
| Body | 15.5–18px / 26–32px |
| Kicker / label | 12–13px, uppercase, `0.08em` |
| Option text | 14.5px / 22px |
| Footnote | 13px / 20–24px |

Spacing — `--space-1…8` = 5 / 10 / 15 / 20 / 30 / 40px (a 1.25× scale; do not tighten
it). Section rhythm 56px, block rhythm 28px, half-step 14px. Radius —
`--radius-sm/md/lg` = 1 / 2 / 4px (yes, 2px: this is newsprint, not a rounded UI).
Shadows — `--shadow-sm/md/lg` only; the page uses `sm` on demo cards.

If you go with the app's own theme instead, the mapping is: ground → `--background`,
demo card → `--card`, ink → `--foreground`, accent → `--primary`, correct →
`--success`, wrong → `--destructive`, divider → `--border`, and the type scale above
with Geist.

## Assets

- **None bundled.** No photography, no illustration, no custom icons — the prototype
  is entirely type, rules and live demos.
- **One image is required**: a real screenshot of the practice screen for §9, at 4:3.
  In the prototype it is an empty `<image-slot id="app-screen">` placeholder. Take it
  from the running app (a question mid-session with a word panel open reads best),
  put it in `public/`, and render it with `next/image`. Until it exists, ship §9 as
  copy only rather than with a grey box.
- Icons: `lucide-react` is already a dependency if you want one in the header CTA;
  the prototype uses none. **(BS)** Broadsheet specifies Phosphor duotone — only
  relevant if you keep Broadsheet *and* decide to add icons.
- Fonts: Source Serif 4 (400, 600, 400 italic) — load via `next/font/google`, not the
  Google CSS `@import` the prototype uses.

## Files in this bundle

```
README.md                                     this document
design-reference/IHK Trainer Landing.dc.html  the HTML design reference (open in a browser)
design-reference/broadsheet-tokens.css        the design system's tokens and component classes
design-reference/support.js                   prototype runtime — needed only to open the HTML
```

To view the reference: open `design-reference/IHK Trainer Landing.dc.html` in a
browser and interact with it — tap the underlined German words, switch the language
control, confirm an answer, press the ladder buttons, start the exam. The behaviour
in the file is the specification; this README is the map.

## Definition of done

- `/` renders the page for a logged-out visitor with an **empty database** and makes
  no Supabase call.
- All four demos work with JS enabled and degrade to readable static content without
  it (the copy around them still explains each feature).
- `40`, `60 minutes` and `0, 1, 3, 7, 14` come from `src/lib/exam/constants.ts` and
  `src/lib/srs/schedule.ts`, not from copy-pasted literals.
- The review simulator's output matches `computeNextReview()` exactly.
- Every string is in the `landing` section of the UI dictionary, and `de` / `dari` /
  `he` are regenerated; German question content stays German in all four.
- Keyboard: tab through the whole page, translate a word, answer the question, walk
  the exam grid — all without a mouse.
- No invented testimonials, no invented statistics, no claim about a feature the app
  does not have.
