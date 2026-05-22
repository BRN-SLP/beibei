"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { CountryMark } from "@/components/brand/CountryMark";
import type {
  CoreBasketEntry,
  CorePartialEntry,
} from "@/lib/core-basket";

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
  /** Countries with 1-2 of the 3 core products priced. Surfaced in
   *  the empty state when zero countries qualify for the ranking. */
  partial?: CorePartialEntry[];
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
  partial,
}: HeroLiveRankingProps) {
  const [base, setBase] = useState<"USD" | "EUR">("USD");
  const data = base === "USD" ? usd : eur;
  const asOf = base === "USD" ? asOfUsd : asOfEur;
  const symbol = base === "USD" ? "$" : "€";

  if (!data || data.length === 0) {
    return <EmptyState partial={partial ?? []} />;
  }

  const maxCents = Math.max(...data.map((e) => e.baseCents));

  return (
    <div>
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
                  <span className="flex items-center gap-2.5 truncate">
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] text-muted-foreground tabular-nums"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <CountryMark code={entry.countryCode} size="sm" />
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
    </div>
  );
}

/**
 * Empty state — shown when no country has all three core products
 * priced yet. Instead of a generic placeholder, surfaces the top
 * countries by partial fill so visitors see what's *almost* there
 * and which slot is missing.
 */
function EmptyState({ partial }: { partial: CorePartialEntry[] }) {
  const hasPartial = partial.length > 0;
  return (
    <div className="flex flex-col">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        Closest to ranking
      </p>
      <h3 className="mt-1 font-serif text-lg font-semibold tracking-tight">
        Bread · milk · transit
      </h3>
      {hasPartial ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            One more product, one more country into the ranking.
          </p>
          <ol className="mt-4 space-y-2.5">
            {partial.slice(0, 5).map((entry) => {
              const widthPct = (entry.filled / entry.total) * 100;
              return (
                <li key={entry.countryCode}>
                  <Link
                    href={`/basket?country=${entry.countryCode}`}
                    className="group block focus-visible:outline-none"
                    aria-label={`${entry.countryName}: ${entry.filled} of ${entry.total} core products priced`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2.5 truncate">
                        <CountryMark code={entry.countryCode} size="sm" />
                        <span className="truncate font-medium">
                          {entry.countryName}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {entry.filled}/{entry.total}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40"
                    >
                      <div
                        className="h-full bg-primary/50 transition-[width] duration-700 ease-out group-hover:bg-primary/80"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            ranking unlocks at 3/3
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Add the first price for bread, milk, or transit. The ranking
            seeds itself from there.
          </p>
          <div className="mt-6 border-t border-border/60 pt-3">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline"
            >
              Add a price
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
