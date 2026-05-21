import Link from "next/link";
import { ArrowRight, ShoppingBasket } from "lucide-react";

import { getBasketSnapshot, type CountryBasket } from "@/lib/aggregate";
import { PRODUCTS } from "@/lib/products";

/**
 * Top-N country basket preview for the landing page.
 *
 * Server component — pulls the cached `getBasketSnapshot()` and ranks
 * countries by coverage (number of products with >= 1 submission).
 *
 * Refactored from a 6-card grid into a vertical bar chart. Mercato is
 * a *data* product; the landing page should show data as data, not
 * stack a third identical card grid under "How it works" and the
 * recent-submissions list. Each row is a country with a coverage bar
 * filled against TOTAL_PRODUCTS — the visual immediately answers
 * "where is this index already useful?" without the visitor having
 * to read six small cards in sequence.
 */
const TOTAL_PRODUCTS = PRODUCTS.length;
const LIMIT = 8;

export async function CountryBasketPreview() {
  const snapshot = await getBasketSnapshot();
  // Rank by coverage descending, tie-break by totalLocalCents
  // (mostly stable since totals across different currencies aren't
  // directly comparable — the tie-break is more about determinism
  // than meaning).
  const ranked = [...snapshot.countries]
    .filter((b) => b.coverage > 0)
    .sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return b.totalLocalCents > a.totalLocalCents ? 1 : -1;
    })
    .slice(0, LIMIT);

  if (ranked.length === 0) {
    return <BasketEmptyState />;
  }

  // Bars are scaled against TOTAL_PRODUCTS — the absolute coverage
  // ceiling. That way a 3/33 country looks like 3/33, not like 100%
  // because it happens to lead the list.
  const denominator = TOTAL_PRODUCTS;

  return (
    <section className="container mx-auto max-w-4xl px-4 py-24">
      <div className="mb-12 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            The basket so far
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Where the index is{" "}
            <span className="italic text-primary">already alive.</span>
          </h2>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            Each bar measures how much of the {denominator}-product basket
            has at least one verified price in that country. Tap a row
            for the full country breakdown.
          </p>
        </div>
        <Link
          href="/basket"
          className="hidden items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary hover:underline sm:inline-flex"
        >
          See full index
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ol className="divide-y divide-border/60 border-y border-border/60">
        {ranked.map((basket) => (
          <CoverageRow
            key={basket.country.code}
            basket={basket}
            denominator={denominator}
          />
        ))}
      </ol>

      <div className="mt-8 sm:hidden">
        <Link
          href="/basket"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          See full index
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

interface CoverageRowProps {
  basket: CountryBasket;
  denominator: number;
}

/**
 * One country row in the coverage bar chart.
 *
 * Layout intent (grid-cols-[6rem_1fr_auto] on md+):
 *   [flag + ISO code]  [bar with overlaid label]  [median price]
 *
 * Mobile collapses to a tighter two-row layout: country header at
 * top, bar + numbers underneath. The bar itself uses an absolute
 * span overlay so the X/33 label reads cleanly even at 1% fill — a
 * 0.2-wide bar would have no room for inline text.
 */
function CoverageRow({ basket, denominator }: CoverageRowProps) {
  const pct = Math.round((basket.coverage / denominator) * 100);
  const widthPct = Math.max(2, (basket.coverage / denominator) * 100);
  const totalMajor = formatMajor(basket.totalLocalCents);

  return (
    <li className="group">
      <Link
        href={`/basket?country=${basket.country.code}`}
        className="grid items-center gap-x-6 gap-y-3 px-2 py-5 transition hover:bg-primary/[0.03] focus-visible:bg-primary/[0.06] focus-visible:outline-none md:grid-cols-[10rem_1fr_auto] md:py-6"
        aria-label={`${basket.country.name}: ${basket.coverage} of ${denominator} products priced`}
      >
        {/* Country */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">
            {basket.country.flag}
          </span>
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold leading-tight">
              {basket.country.name}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {basket.country.code} · {basket.country.currency}
            </p>
          </div>
        </div>

        {/* Bar */}
        <div
          className="relative h-7 overflow-hidden rounded-sm bg-muted/60"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary/80 transition-[width] duration-700 ease-out group-hover:bg-primary"
            style={{ width: `${widthPct}%` }}
          />
          <div className="relative flex h-full items-center justify-between px-3 font-mono text-[11px] uppercase tracking-wider mix-blend-multiply dark:mix-blend-screen">
            <span className="font-semibold text-primary-foreground/90 dark:text-primary-foreground">
              {basket.coverage}/{denominator}
            </span>
            <span className="text-muted-foreground">
              {pct}%
            </span>
          </div>
        </div>

        {/* Median basket */}
        <div className="font-mono text-right tabular-nums">
          <p className="text-base font-semibold tracking-tight">
            {totalMajor}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {basket.country.currency}
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            basket sum
          </p>
        </div>
      </Link>
    </li>
  );
}

function BasketEmptyState() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-20">
      <div className="rounded-md border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
        <div
          aria-hidden="true"
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <ShoppingBasket className="h-6 w-6" />
        </div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          The basket is empty
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          No country has been priced{" "}
          <span className="italic text-primary">yet.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Mercato launches at zero submissions. Be the first to add a price
          in your country — the rest of the basket builds itself.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Link href="/scan" className="inline-flex items-center gap-1.5 hover:underline">
            Add a price
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Format a price-cents BigInt to a major-unit string with up to 2
 * decimal places, grouping thousands. Output examples:
 *   1_234_500n → "12 345"
 *   1_234_567n → "12 345.67"
 *   123n       → "1.23"
 * Uses thin-space grouping (U+202F) which renders cleanly in most
 * languages and matches the editorial-mono feel of the dashboard.
 */
function formatMajor(cents: bigint): string {
  if (cents === 0n) return "0";
  const major = cents / 100n;
  const remainder = cents % 100n;
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (remainder === 0n) return grouped;
  return `${grouped}.${remainder.toString().padStart(2, "0")}`;
}
