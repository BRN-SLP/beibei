"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import type { CoreBasketEntry } from "@/lib/core-basket";

interface HeroLiveRankingProps {
  /** Pre-computed rankings in both base currencies. Server fetched
   *  these via getFxRatesBoth + rankCoreBasket so the client toggle
   *  doesn't trigger any network. */
  usd: CoreBasketEntry[] | null;
  eur: CoreBasketEntry[] | null;
  /** ISO date string from the FX provider — shown small as the
   *  "as of" line so the visitor knows what 'live' means. */
  asOfUsd: string | null;
  asOfEur: string | null;
}

/**
 * Live country ranking widget for the hero right column.
 *
 * Visual intent: a single horizontal bar chart showing the cheapest →
 * most expensive country for a comparable three-product basket
 * (bread + milk + transit). The bar fills against the most-expensive
 * country in the current view, so the visitor sees the *relative*
 * gap, not just absolute numbers.
 *
 * Toggle pill switches between USD and EUR — same data, recomputed
 * server-side once, no extra fetch.
 *
 * This replaces the hero-right brand-basket SVG. The brand signal
 * remains in the navbar logo, favicon, and OG image; the hero's
 * job is now to show that Mercato actually does the data thing it
 * claims, not just repeat the wordmark.
 */
export function HeroLiveRanking({
  usd,
  eur,
  asOfUsd,
  asOfEur,
}: HeroLiveRankingProps) {
  const [base, setBase] = useState<"USD" | "EUR">("USD");
  const data = base === "USD" ? usd : eur;
  const asOf = base === "USD" ? asOfUsd : asOfEur;
  const symbol = base === "USD" ? "$" : "€";

  if (!data || data.length === 0) {
    // No core-basket-complete country yet — preserve the column space
    // with a quiet placeholder so the hero layout doesn't collapse.
    return (
      <div className="flex h-full flex-col justify-center rounded-md border border-border/60 bg-card/40 px-5 py-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          Live ranking
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Building the comparable basket. As soon as one country has
          bread, milk, and transit priced, it shows up here.
        </p>
      </div>
    );
  }

  const maxCents = Math.max(...data.map((e) => e.baseCents));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="rounded-md border border-border/60 bg-card/60 p-5 backdrop-blur"
    >
      {/* Header — title + base-currency toggle */}
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Live country ranking
          </p>
          <h3 className="mt-1 font-serif text-lg font-semibold tracking-tight">
            Bread · milk · transit
          </h3>
        </div>
        <div
          role="tablist"
          aria-label="Base currency"
          className="inline-flex overflow-hidden rounded-sm border border-border/60 font-mono text-[10px] uppercase tracking-[0.16em]"
        >
          {(["USD", "EUR"] as const).map((code) => {
            const active = base === code;
            return (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setBase(code)}
                className={`px-2.5 py-1 transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bars */}
      <ol className="space-y-2.5">
        {data.map((entry, i) => {
          const widthPct = Math.max(8, (entry.baseCents / maxCents) * 100);
          const major = (entry.baseCents / 100).toFixed(2);
          return (
            <li key={entry.countryCode}>
              <Link
                href={`/basket?country=${entry.countryCode}`}
                className="group block focus-visible:outline-none"
                aria-label={`${entry.countryName}: ${symbol}${major} ${base} core basket`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-baseline gap-2 truncate">
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] text-muted-foreground"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base leading-none" aria-hidden="true">
                      {entry.flag}
                    </span>
                    <span className="truncate font-medium">
                      {entry.countryName}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    {symbol}
                    {major}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40"
                >
                  <div
                    className="h-full bg-primary/70 transition-[width] duration-700 ease-out group-hover:bg-primary"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Footer — provenance */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>
          fx · ecb · {asOf ?? "—"}
        </span>
        <Link
          href="/basket"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Full index
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </motion.div>
  );
}
