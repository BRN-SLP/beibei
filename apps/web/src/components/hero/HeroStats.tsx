import { useTranslations } from "next-intl";

/**
 * Live stats for the hero. Three numbers, mono-caps labels, one line.
 *
 * Counts are pre-computed on the server (see `HeroStatsServer`) and
 * passed in as plain props so the hero ships pre-filled with no
 * mount-time RPC and no layout shift. Labels translate via
 * next-intl so the row reads in the visitor's locale.
 */
interface HeroStatsProps {
  finalized: number;
  countries: number;
  pending: number;
}

export function HeroStats({ finalized, countries, pending }: HeroStatsProps) {
  const t = useTranslations("hero.stats");
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-primary/15 py-4">
      <Stat n={finalized} label={t("verified")} />
      <Bullet />
      <Stat n={countries} label={t("countries")} />
      <Bullet />
      <Stat n={pending} label={t("pending")} subdued={pending === 0} />
    </p>
  );
}

function Stat({
  n,
  label,
  subdued = false,
}: {
  n: number;
  label: string;
  subdued?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
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
    </span>
  );
}

function Bullet() {
  return (
    <span aria-hidden="true" className="text-primary/30">
      ·
    </span>
  );
}

/* CountUp was removed: the animation re-kicked the digits back to 0
 * on hydration and counted up to the SSR value, which read as the
 * hero "jumping" into place every page load. SSR already paints the
 * final numbers — that's enough. */
