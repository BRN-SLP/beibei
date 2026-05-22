import { useTranslations } from "next-intl";

/**
 * Live stats strip. Three numbers in fixed-slot grid cells, never
 * reflow as values grow.
 *
 * The earlier version used `flex flex-wrap` with inline bullet
 * separators. When `pending` or `verified` grew past three digits
 * the third stat dropped to a second line, leaving an orphan bullet
 * "·" at the end of the first line and visually breaking the hero.
 *
 * Grid with three fixed columns on sm+ (stacked on mobile) anchors
 * each stat to its own cell. Values change length, the cell width
 * doesn't.
 *
 * Counts are pre-computed on the server (see `HeroStatsServer`).
 * Labels translate via next-intl.
 */
interface HeroStatsProps {
  finalized: number;
  countries: number;
  pending: number;
}

export function HeroStats({ finalized, countries, pending }: HeroStatsProps) {
  const t = useTranslations("hero.stats");
  return (
    <div
      role="list"
      aria-label="Live network stats"
      className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      <Stat n={finalized} label={t("verified")} />
      <Stat n={countries} label={t("countries")} />
      <Stat n={pending} label={t("pending")} subdued={pending === 0} />
    </div>
  );
}

interface StatProps {
  n: number;
  label: string;
  subdued?: boolean;
}

function Stat({ n, label, subdued = false }: StatProps) {
  return (
    <div role="listitem" className="flex items-baseline gap-3 px-6 py-5">
      <span
        className={`font-serif text-3xl font-semibold tabular-nums tracking-tight ${
          subdued ? "text-muted-foreground/70" : "text-foreground"
        }`}
      >
        {n.toLocaleString()}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/* CountUp was removed: the animation re-kicked the digits back to 0
 * on hydration and counted up to the SSR value, which read as the
 * hero "jumping" into place every page load. SSR already paints the
 * final numbers — that's enough. */
