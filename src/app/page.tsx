import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";
import { formatTemplate } from "@/lib/i18n/format-template";
import { LANGUAGE_LABELS } from "@/lib/i18n/languages";
import { EXAM_DURATION_SECONDS, EXAM_QUESTION_COUNT } from "@/lib/exam/constants";
import { INTERVAL_BY_STREAK_DAYS } from "@/lib/srs/schedule";
import { TryQuestionDemo } from "@/components/landing/try-question-demo";
import { ReviewLadderDemo } from "@/components/landing/review-ladder-demo";
import { ExamModeDemo } from "@/components/landing/exam-mode-demo";
import { TopicTabs } from "@/components/landing/topic-tabs";

export default async function HomePage() {
  const { dict } = await getUiDict();
  const l = dict.landing;
  const otherLanguages = [LANGUAGE_LABELS.en, LANGUAGE_LABELS.dari, LANGUAGE_LABELS.he].join(", ");
  const allLanguages = [LANGUAGE_LABELS.de, LANGUAGE_LABELS.en, LANGUAGE_LABELS.dari, LANGUAGE_LABELS.he].join(
    ", "
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[852px] items-center justify-between gap-4 px-4 py-3">
          <span className="text-base font-semibold">{dict.auth.appName}</span>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#try" className="hover:text-foreground">
              {l.navTry}
            </a>
            <a href="#topics" className="hover:text-foreground">
              {l.navTopics}
            </a>
            <a href="#translation" className="hover:text-foreground">
              {l.navTranslation}
            </a>
            <a href="#exam" className="hover:text-foreground">
              {l.navExam}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/auth/login">{dict.auth.loginCta}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">{dict.auth.registerCta}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[852px] flex-col gap-24 px-4 py-16">
        {/* Hero */}
        <section className="flex flex-col items-start gap-5">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {l.heroLine1}
            <br />
            {l.heroLine2}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">{l.heroSub}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/register">{l.heroPrimaryCta}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#trainers">{l.heroSecondaryCta}</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{l.heroFinePrint}</p>
        </section>

        {/* Proof strip */}
        <section className="grid grid-cols-1 gap-6 border-y border-border py-8 sm:grid-cols-3">
          <div>
            <p className="text-3xl font-semibold text-primary">
              {EXAM_QUESTION_COUNT} / {Math.round(EXAM_DURATION_SECONDS / 60)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{l.proofExamCaption}</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-primary">4</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTemplate(l.proofLanguagesCaption, { languages: allLanguages })}
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-primary">{INTERVAL_BY_STREAK_DAYS.join(" / ")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTemplate(l.proofReviewCaption, { numbers: INTERVAL_BY_STREAK_DAYS.join(", ") })}
            </p>
          </div>
        </section>

        {/* #try */}
        <section id="try" className="flex flex-col gap-4 scroll-mt-20">
          <h2 className="text-2xl font-semibold">{l.tryHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.tryIntro}</p>
          <TryQuestionDemo />
        </section>

        {/* #translation */}
        <section id="translation" className="flex flex-col gap-6 scroll-mt-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{l.translationKicker}</p>
            <h2 className="mt-1 text-2xl font-semibold">{l.translationHeading}</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              [l.translationItem1Title, l.translationItem1Body],
              [l.translationItem2Title, l.translationItem2Body],
              [l.translationItem3Title, l.translationItem3Body],
              [l.translationItem4Title, l.translationItem4Body],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* #topics */}
        <section id="topics" className="flex flex-col gap-4 scroll-mt-20">
          <h2 className="text-2xl font-semibold">{l.topicsHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.topicsNote}</p>
          <TopicTabs />
        </section>

        {/* #exam */}
        <section id="exam" className="flex flex-col gap-4 scroll-mt-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{l.examKicker}</p>
          <h2 className="text-2xl font-semibold">{l.examHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.examP1}</p>
          <p className="max-w-2xl text-muted-foreground">{l.examP2}</p>
          <ExamModeDemo />
        </section>

        {/* Review ladder */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{l.reviewCopyKicker}</p>
          <h2 className="text-2xl font-semibold">{l.reviewCopyHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.reviewCopyP1}</p>
          <p className="max-w-2xl text-muted-foreground">{l.reviewCopyP2}</p>
          <ReviewLadderDemo />
        </section>

        {/* On your own schedule */}
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{l.ownScheduleKicker}</p>
          <h2 className="text-2xl font-semibold">{l.ownScheduleHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.ownScheduleP1}</p>
          <p className="max-w-2xl text-muted-foreground">{l.ownScheduleP2}</p>
        </section>

        {/* #trainers */}
        <section id="trainers" className="flex flex-col gap-4 scroll-mt-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{l.trainersKicker}</p>
          <h2 className="text-2xl font-semibold">{l.trainersHeading}</h2>
          <p className="max-w-2xl text-muted-foreground">{l.trainersP1}</p>
          <p className="max-w-2xl text-muted-foreground">
            {formatTemplate(l.trainersP2, { languages: otherLanguages })}
          </p>
        </section>

        {/* Pull quote */}
        <section className="border-l-4 border-primary py-2 pl-6">
          <p className="text-xl font-medium italic">&ldquo;{l.pullQuote}&rdquo;</p>
          <p className="mt-2 text-sm text-muted-foreground">{l.pullQuoteCaption}</p>
        </section>

        {/* #start */}
        <section id="start" className="flex flex-col gap-4 scroll-mt-20 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">{l.startHeading}</h2>
          <p className="max-w-xl text-muted-foreground">{l.startBody}</p>
          <form action="/auth/register" method="get" className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              name="email"
              placeholder={l.startEmailPlaceholder}
              aria-label={l.startEmailPlaceholder}
              className="sm:max-w-xs"
            />
            <Button type="submit" size="lg">
              {l.startCreateAccount}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">{dict.auth.minPasswordLength}</p>
          <p className="text-sm text-muted-foreground">
            {l.startAlreadyHaveAccount}{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              {l.startSignIn}
            </Link>{" "}
            {l.startOr}{" "}
            <Link href="/auth/reset-password" className="font-medium text-primary hover:underline">
              {l.startResetPassword}
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-[852px] grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-semibold">{dict.auth.appName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{l.footerBlurb}</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {l.footerProductHeading}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              <li>
                <a href="#try" className="text-muted-foreground hover:text-foreground">
                  {l.navTry}
                </a>
              </li>
              <li>
                <a href="#topics" className="text-muted-foreground hover:text-foreground">
                  {l.navTopics}
                </a>
              </li>
              <li>
                <a href="#exam" className="text-muted-foreground hover:text-foreground">
                  {l.navExam}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {l.footerAccountHeading}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              <li>
                <Link href="/auth/register" className="text-muted-foreground hover:text-foreground">
                  {l.footerCreateAccount}
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">
                  {l.footerSignIn}
                </Link>
              </li>
            </ul>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {l.footerLanguagesHeading}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{allLanguages}</p>
          </div>
        </div>
        <p className="mx-auto max-w-[852px] px-4 pb-8 text-xs text-muted-foreground">{l.footerDisclaimer}</p>
      </footer>
    </div>
  );
}
