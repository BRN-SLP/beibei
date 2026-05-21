"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useChainId } from "wagmi";

import { usePriceFeed } from "@/hooks/usePriceFeed";
import { zoneKeyToCountry } from "@/lib/encode";

/**
 * Live stats for the hero — one editorial sentence, three numbers.
 *
 * Refactored away from the "hero-metric template" (3-column grid of
 * big-number / small-label cards), which is the impeccable absolute
 * ban and a premium-web-design Pillar 1 red flag — "looks templated".
 *
 * The replacement reads like a newspaper byline: tabular numerals
 * carry the data weight, mono-uppercase labels space them, the whole
 * line sits inline with the rest of the hero copy. Same three
 * numbers, none of the "metric grid" baggage.
 *
 * Three numbers chosen:
 *   - finalized = prices the consensus engine has fully accepted
 *   - countries = distinct countries with ≥ 1 finalized price
 *   - pending   = submissions still waiting on a vote (so the
 *                 visitor sees there's live work to do, which is
 *                 the conversion driver to /scan)
 */
export function HeroStats() {
  const chainId = useChainId();
  const { records } = usePriceFeed(chainId);

  const finalized = records.filter((r) => r.finalized && r.accepted).length;
  const countries = new Set(
    records
      .filter((r) => r.finalized && r.accepted)
      .map((r) => zoneKeyToCountry(r.zoneKey))
      .filter(Boolean),
  ).size;
  const pending = records.filter((r) => !r.finalized).length;

  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-primary/15 py-4"
    >
      <Stat n={finalized} label="prices verified" />
      <Bullet />
      <Stat n={countries} label="countries live" />
      <Bullet />
      <Stat n={pending} label="awaiting peer vote" subdued={pending === 0} />
    </motion.p>
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
      <CountUp value={n} subdued={subdued} />
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

/**
 * Count-up number animation respecting prefers-reduced-motion. Same
 * easeOutCubic curve the page already uses elsewhere so the hero
 * has one motion vocabulary.
 */
function CountUp({ value, subdued }: { value: number; subdued: boolean }) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(prefersReduced ? value : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, prefersReduced]);

  return (
    <span
      className={`font-serif text-3xl font-semibold tabular-nums tracking-tight ${
        subdued ? "text-muted-foreground/70" : "text-foreground"
      }`}
    >
      {display.toLocaleString()}
    </span>
  );
}
