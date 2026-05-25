"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "How it works" — paper-folder tabbed flow.
 *
 * Earlier attempts at this section converged on identical three-card
 * grids and tripped the impeccable absolute ban no matter how the
 * cards were tuned. User feedback: "сделать как три вкладки в папке,
 * листаем страничку и по очереди". Same three stages, but only one
 * is on screen at a time, in a much larger panel — no grid, no
 * forced symmetry, room for the artifact to breathe.
 *
 * Folder visual:
 *
 *     ┌───────┐ ┌───────┐ ┌───────┐
 *     │ 01    │ │ 02    │ │ 03    │
 *     │  SCAN │ │ VERIFY│ │ EARN  │
 *     └───────┘─└───────┘─└───────┘  ← active tab keeps its bottom
 *                                       open into the panel below
 *     ┌─────────────────────────────────┐
 *     │                                 │
 *     │   [artifact]   [copy]           │
 *     │                                 │
 *     └─────────────────────────────────┘
 *
 * Auto-advances every 7s until the user clicks (then stays manual).
 * Keyboard arrows work too — left/right cycle stages.
 */
export function HowItWorks() {
  const t = useTranslations("howItWorks");
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  const stages = [
    {
      tag: "scan",
      title: t("step1Title"),
      body: t("step1Body"),
      Artifact: SubmissionArtifact,
    },
    {
      tag: "verify",
      titleNode: (
        <>
          {t("step2Title")}{" "}
          <span className="italic text-primary">{t("step2TitleAccent")}</span>
        </>
      ),
      title: t("step2Title"),
      body: t("step2Body"),
      Artifact: VoteArtifact,
    },
    {
      tag: "earn",
      title: t("step3Title"),
      body: t("step3Body"),
      Artifact: RewardArtifact,
    },
  ] as const;

  // Auto-rotate until the user takes manual control.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % stages.length);
    }, 7000);
    return () => clearInterval(id);
  }, [auto, stages.length]);

  const selectStage = useCallback((i: number) => {
    setActive(i);
    setAuto(false);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        selectStage((active + 1) % stages.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        selectStage((active - 1 + stages.length) % stages.length);
      }
    },
    [active, selectStage, stages.length],
  );

  const current = stages[active];

  return (
    <section className="container mx-auto max-w-5xl px-4 pb-24 pt-14 md:pt-16">
      <h2 className="mb-4 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
        {t("title1")}{" "}
        <span className="italic text-primary">{t("title2")}</span>
      </h2>
      <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {t("intro")}
      </p>

      {/* Tab strip — editorial underlined nav resting on a single
          horizontal rule. Active stage gets a primary-colored 2px
          underline that overlaps the rule. Earlier folder-tab chrome
          (border + bg-card on the active tab + panel) produced
          visible card-on-card stacking; gone. */}
      <div
        role="tablist"
        aria-label={t("tabsAria")}
        onKeyDown={onKeyDown}
        className="relative flex items-end gap-1 border-b border-border/60 sm:gap-2"
      >
        {stages.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.tag}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`stage-panel-${s.tag}`}
              id={`stage-tab-${s.tag}`}
              onClick={() => selectStage(i)}
              className={`relative flex flex-1 flex-col items-start gap-1 px-3 py-3 text-left transition-colors sm:flex-row sm:flex-initial sm:items-baseline sm:gap-2 sm:px-6 sm:py-4 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <span
                className={`font-serif text-2xl font-bold leading-none transition-colors sm:text-3xl ${
                  isActive ? "text-primary" : "text-foreground/40"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em]">
                <span aria-hidden="true" className="hidden sm:inline">· </span>
                {s.tag}
              </span>
              {/* Active indicator — 2px primary underline overlapping
                  the tablist's bottom border. */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel — naked content for the active stage. No card chrome
          to avoid box-in-box stacking with the tab strip. min-h
          locks the height across all three artifacts so switching
          tabs doesn't pop the page geometry. */}
      <div
        role="tabpanel"
        id={`stage-panel-${current.tag}`}
        aria-labelledby={`stage-tab-${current.tag}`}
        className="min-h-[340px] pt-10 md:min-h-[300px] md:pt-14"
      >
        <div className="grid items-start gap-10 md:grid-cols-[1fr_1fr]">
          <div className="space-y-4 md:order-2">
            <h3 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              {"titleNode" in current && current.titleNode
                ? current.titleNode
                : current.title}
            </h3>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
              {current.body}
            </p>
          </div>
          <div className="md:order-1">
            <current.Artifact />
          </div>
        </div>
      </div>

      {/* Pagination dots — stage indicator. Click also navigates. */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stages.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              aria-label={`Go to stage ${i + 1} · ${s.tag}`}
              onClick={() => selectStage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active
                  ? "w-8 bg-primary"
                  : "w-3 bg-border hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          stage {active + 1} of {stages.length}
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Artifacts — bigger, more breathing room now that only one shows
 * at a time. No fixed heights, no shared skeleton needed.
 * ────────────────────────────────────────────────────────────── */

function SubmissionArtifact() {
  const t = useTranslations("howItWorks.artifacts");
  return (
    <div className="font-mono">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {t("submissionStamp")}
      </p>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="inline-flex h-8 w-12 items-center justify-center rounded-sm border border-border bg-card font-mono text-xs font-semibold tracking-[0.2em] text-foreground/80">
          UA
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          14:42 utc
        </span>
      </div>
      <div className="py-5">
        <p className="text-xs text-muted-foreground">milk · 1 L</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-foreground md:text-5xl">
          18.00{" "}
          <span className="text-base font-normal text-muted-foreground">
            UAH
          </span>
        </p>
      </div>
      <div className="border-t border-border/60 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("submissionFooter")}
      </div>
    </div>
  );
}

function VoteArtifact() {
  const t = useTranslations("howItWorks.artifacts");
  return (
    <div className="font-mono">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {t("voteStamp")}
      </p>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="flex items-center gap-2.5">
          <Dot tone="filled" />
          <Dot tone="filled" />
          <Dot tone="empty" />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("voteWindow")}
        </span>
      </div>
      <div className="py-5">
        <p className="text-xs text-muted-foreground">
          {t("votePeersIn", { country: "UA" })}
        </p>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-foreground md:text-5xl">
          2/3
        </p>
      </div>
      <div className="space-y-1.5 border-t border-border/60 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex justify-between">
          <span>0x9a…21</span>
          <span className="text-foreground/80">yes</span>
        </div>
        <div className="flex justify-between">
          <span>0x4c…7e</span>
          <span className="text-foreground/80">yes</span>
        </div>
      </div>
    </div>
  );
}

function RewardArtifact() {
  const t = useTranslations("howItWorks.artifacts");
  return (
    <div className="font-mono">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {t("rewardStamp")}
      </p>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-xs text-muted-foreground">
          {t("rewardNetToWallet")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          ↗ tx 0xab…1c
        </span>
      </div>
      <div className="py-5">
        <p className="text-xs text-muted-foreground">
          {t("rewardSubmitterShare")}
        </p>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-primary md:text-5xl">
          + 0.05{" "}
          <span className="text-base font-normal text-muted-foreground">
            cUSD
          </span>
        </p>
      </div>
      <div className="space-y-1.5 border-t border-border/60 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex justify-between">
          <span>{t("rewardVerifiersRow")}</span>
          <span className="text-foreground/80">+ 0.05 each</span>
        </div>
        <div className="flex justify-between">
          <span>{t("rewardSweepRow")}</span>
          <span className="text-foreground/80">{t("rewardSweepValue")}</span>
        </div>
      </div>
    </div>
  );
}

function Dot({ tone }: { tone: "filled" | "empty" }) {
  return (
    <span
      aria-hidden="true"
      className={
        tone === "filled"
          ? "inline-block h-2.5 w-2.5 rounded-full bg-primary"
          : "inline-block h-2.5 w-2.5 rounded-full border border-border bg-transparent"
      }
    />
  );
}
