import Link from "next/link";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CountryMark } from "@/components/brand/CountryMark";
import { getBasketSnapshot, type CountryBasket } from "@/lib/aggregate";
import { formatMajor } from "@/lib/format-cents";
import {
  applyFxBase,
  getActiveFxRates,
  getFxBase,
  type FxBase,
} from "@/lib/fx-base";
import type { FxRates } from "@/lib/fx";
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
  const fxBase = await getFxBase();
  const [snapshot, t, rates] = await Promise.all([
    getBasketSnapshot(),
    getTranslations("basketPreview"),
    getActiveFxRates(fxBase),
  ]);
  // Rank by coverage descending, tie-break by totalLocalCents
  // (mostly stable since totals across different currencies aren't
  // directly comparable, the tie-break is more about determinism
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

  // Bars are scaled against TOTAL_PRODUCTS, the absolute coverage
  // ceiling. That way a 3/33 country looks like 3/33, not like 100%
  // because it happens to lead the list.
  const denominator = TOTAL_PRODUCTS;

  return (
    <section className="container mx-auto max-w-5xl px-4 pb-20 pt-14 md:pt-16">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            {t("section")}
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title1")}{" "}
            <span className="italic text-primary">{t("titleAccent")}</span>
          </h2>
          <p className="mt-3 max-w-prose text-justify text-sm text-muted-foreground hyphens-auto">
            {t("subtitle", { total: denominator })}
          </p>
        </div>
        <Link
          href="/basket"
          className="hidden items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary hover:underline sm:inline-flex"
        >
          {t("seeFull")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ol className="divide-y divide-border/60 border-y border-border/60">
        {ranked.map((basket) => (
          <CoverageRow
            key={basket.country.code}
            basket={basket}
            denominator={denominator}
            ariaLabel={t("rowAria", {
              country: basket.country.name,
              coverage: basket.coverage,
              total: denominator,
            })}
            sumLabel={t("basketSum")}
            fxBase={fxBase}
            rates={rates}
          />
        ))}
      </ol>

      <div className="mt-8 sm:hidden">
        <Link
          href="/basket"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t("seeFull")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

interface CoverageRowProps {
  basket: CountryBasket;
  denominator: number;
  ariaLabel: string;
  sumLabel: string;
  fxBase: FxBase;
  rates: FxRates | null;
}

/**
 * One country row in the coverage bar chart.
 *
 * Layout intent (grid-cols-[6rem_1fr_auto] on md+):
 *   [flag + ISO code]  [bar with overlaid label]  [median price]
 *
 * Mobile collapses to a tighter two-row layout: country header at
 * top, bar + numbers underneath. The bar itself uses an absolute
 * span overlay so the X/33 label reads cleanly even at 1% fill, a
 * 0.2-wide bar would have no room for inline text.
 */
function CoverageRow({
  basket,
  denominator,
  ariaLabel,
  sumLabel,
  fxBase,
  rates,
}: CoverageRowProps) {
  const widthPct = Math.max(2, (basket.coverage / denominator) * 100);
  const { cents: displayCents, currency: displayCurrency } = applyFxBase(
    basket.totalLocalCents,
    basket.country.currency,
    fxBase,
    rates,
  );
  const totalMajor = formatMajor(displayCents);

  return (
    <li className="group">
      <Link
        href={`/basket?country=${basket.country.code}`}
        className="grid items-center gap-x-6 gap-y-1 px-2 py-3 transition hover:bg-primary/[0.04] focus-visible:bg-primary/[0.06] focus-visible:outline-none md:grid-cols-[auto_1fr_auto] md:py-3.5"
        aria-label={ariaLabel}
      >
        {/* Country mark — desaturated SVG flag + mono caps ISO code.
            Production canonical; see components/brand/CountryMark. */}
        <CountryMark code={basket.country.code} size="md" />

        {/* Country meta + coverage progress underline */}
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold leading-tight">
            {basket.country.name}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="relative h-px flex-1 bg-border/50"
            >
              <span
                className="absolute inset-y-0 left-0 -top-px h-[3px] bg-primary/70 transition-[width] duration-700 ease-out group-hover:bg-primary"
                style={{ width: `${widthPct}%` }}
              />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
              {basket.coverage}/{denominator}
            </span>
          </div>
        </div>

        {/* Median basket sum */}
        <div className="font-mono text-right tabular-nums">
          <p className="text-base font-semibold tracking-tight">
            {totalMajor}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {displayCurrency}
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {sumLabel}
          </p>
        </div>
      </Link>
    </li>
  );
}

async function BasketEmptyState() {
  const t = await getTranslations("basketPreview.empty");
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
          {t("section")}
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          {t("title1")}{" "}
          <span className="italic text-primary">{t("titleAccent")}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          {t("body")}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Link href="/scan" className="inline-flex items-center gap-1.5 hover:underline">
            {t("cta")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

