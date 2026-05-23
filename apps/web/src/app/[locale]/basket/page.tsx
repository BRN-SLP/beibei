import Link from "next/link";
import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CountryMark } from "@/components/brand/CountryMark";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getBasketSnapshot,
  type CountryBasket,
  type ProductPriceSummary,
} from "@/lib/aggregate";
import { formatMajor } from "@/lib/format-cents";
import { CATEGORY_LABELS, PRODUCTS, type ProductCategory } from "@/lib/products";

/**
 * Cost-of-living dashboard at `/basket`.
 *
 * Two modes, switched by the `?country=XX` query param:
 *
 *   - INDEX (no param) — table of every launch country sorted by
 *     coverage descending, each row linkable into that country's
 *     detailed breakdown.
 *   - DETAIL (?country=XX) — per-category product table for one
 *     country showing the median price + sample size + how recent the
 *     last contributing submission is.
 *
 * Both modes server-render off the same cached snapshot
 * (`getBasketSnapshot`) — no client fetching, no skeletons, page
 * shows the freshest data Forno had within the last 60 seconds.
 */

interface BasketPageProps {
  searchParams: Promise<{ country?: string | string[] }>;
}

export default async function BasketPage({ searchParams }: BasketPageProps) {
  const params = await searchParams;
  const rawCountry = Array.isArray(params.country)
    ? params.country[0]
    : params.country;
  const selectedCode = rawCountry?.trim().toUpperCase();

  const snapshot = await getBasketSnapshot();

  if (snapshot.countries.length === 0 || snapshot.countries.every((b) => b.coverage === 0)) {
    return <EmptyState />;
  }

  const selected = selectedCode
    ? snapshot.countries.find((b) => b.country.code === selectedCode)
    : undefined;

  if (selected) {
    return <CountryDetail basket={selected} />;
  }

  return <CountryIndex baskets={snapshot.countries} />;
}

async function CountryIndex({ baskets }: { baskets: readonly CountryBasket[] }) {
  const t = await getTranslations("basket.index");
  // Show all countries — including zero-coverage ones at the bottom —
  // so contributors see what's missing and can fill gaps.
  const ranked = [...baskets].sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    return a.country.name.localeCompare(b.country.name);
  });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
          {t("title1")}{" "}
          <span className="italic text-primary">{t("titleAccent")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
          {t("body", { count: PRODUCTS.length })}
        </p>
      </header>

      {/* Column header strip — sits OUTSIDE the row container so the
          row list reads as a divider-rhythm chart, not a primitive
          table-in-a-box. */}
      <div className="grid grid-cols-[3rem_1fr_8rem_auto] items-baseline gap-x-6 border-b border-border/60 px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span aria-hidden="true">№</span>
        <span>{t("columns.country")}</span>
        <span className="text-right">{t("columns.coverage")}</span>
        <span className="text-right">{t("columns.basketTotal")}</span>
      </div>

      <ol className="divide-y divide-border/60 border-b border-border/60">
        {ranked.map((basket, i) => (
          <CountryRow
            key={basket.country.code}
            basket={basket}
            rank={i + 1}
          />
        ))}
      </ol>
    </main>
  );
}

async function CountryRow({
  basket,
  rank,
}: {
  basket: CountryBasket;
  rank: number;
}) {
  const t = await getTranslations("basket.index");
  const hasData = basket.coverage > 0;
  const total = formatMajor(basket.totalLocalCents);
  const coveragePct = Math.max(
    hasData ? 4 : 0,
    (basket.coverage / PRODUCTS.length) * 100,
  );

  return (
    <li className={hasData ? "group" : "opacity-50"}>
      <Link
        href={`/basket?country=${basket.country.code}`}
        className="grid grid-cols-[3rem_1fr_8rem_auto] items-center gap-x-6 px-3 py-4 transition hover:bg-primary/[0.04] focus-visible:bg-primary/[0.06] focus-visible:outline-none"
        aria-label={t("rowAria", {
          country: basket.country.name,
          coverage: basket.coverage,
          total: PRODUCTS.length,
        })}
      >
        {/* Rank */}
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {String(rank).padStart(2, "0")}
        </span>

        {/* Country mark + name */}
        <span className="flex min-w-0 items-center gap-3">
          <CountryMark code={basket.country.code} size="md" />
          <span className="truncate font-medium">{basket.country.name}</span>
        </span>

        {/* Coverage with thin progress underline */}
        <span className="flex items-center justify-end gap-2 font-mono text-xs tabular-nums">
          <span
            aria-hidden="true"
            className="relative h-px w-16 bg-border/50"
          >
            <span
              className="absolute inset-y-0 left-0 -top-px h-[3px] bg-primary/70 group-hover:bg-primary"
              style={{ width: `${coveragePct}%` }}
            />
          </span>
          <span className="text-muted-foreground">
            {basket.coverage}/{PRODUCTS.length}
          </span>
        </span>

        {/* Basket total + affordance hint */}
        <span className="flex flex-col items-end gap-0.5 text-right font-mono tabular-nums">
          {hasData ? (
            <>
              <span className="text-sm font-semibold">
                {total}{" "}
                <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                  {basket.country.currency}
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("viewAfford")}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">—</span>
              <span className="text-[10px] uppercase tracking-wider text-primary/80">
                {t("beFirstAfford")}
              </span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

async function CountryDetail({ basket }: { basket: CountryBasket }) {
  const t = await getTranslations("basket.detail");
  // Group products by category for the breakdown table.
  const byCategory = new Map<ProductCategory, ProductPriceSummary[]>();
  for (const p of basket.prices) {
    const arr = byCategory.get(p.product.category) ?? [];
    arr.push(p);
    byCategory.set(p.product.category, arr);
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <Link
        href="/basket"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mb-10 space-y-4">
        <div className="flex items-center gap-3">
          {/* Country mark — desaturated flag + ISO pill, large size
              so the country reads as the page identity. */}
          <CountryMark code={basket.country.code} size="lg" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            {t("kicker", { currency: basket.country.currency })}
          </p>
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
          {basket.country.nameLocal ?? basket.country.name}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t.rich("summary", {
            value: formatMajor(basket.totalLocalCents),
            currency: basket.country.currency,
            filled: basket.coverage,
            total: PRODUCTS.length,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </header>

      {basket.coverage === 0 ? (
        <Card className="border-dashed">
          <CardContent className="px-6 py-12 text-center">
            <div
              aria-hidden="true"
              className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <ShoppingBasket className="h-6 w-6" />
            </div>
            <h2 className="font-serif text-2xl font-semibold">
              {t.rich("emptyTitle", {
                country: basket.country.name,
                accent: (chunks) => (
                  <span className="italic text-primary">{chunks}</span>
                ),
              })}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {t("emptyBody")}
            </p>
            <Link
              href="/scan"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("emptyCta")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(
            Object.keys(CATEGORY_LABELS) as ProductCategory[]
          ).map((category) => {
            const products = byCategory.get(category);
            if (!products || products.length === 0) return null;
            return (
              <CategorySection
                key={category}
                label={CATEGORY_LABELS[category]}
                products={products}
                currency={basket.country.currency}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

async function CategorySection({
  label,
  products,
  currency,
}: {
  label: string;
  products: ProductPriceSummary[];
  currency: string;
}) {
  const t = await getTranslations("basket.detail");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/60">
            {products.map((p) => {
              const hasData = p.sampleSize > 0;
              return (
                <tr
                  key={p.product.slug}
                  className={hasData ? "" : "opacity-50"}
                >
                  <td className="px-6 py-3">
                    <div className="font-medium">{p.product.label}</div>
                    {p.product.hint && (
                      <div className="text-xs text-muted-foreground">
                        {p.product.hint}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {hasData ? (
                      <>
                        {formatMajor(p.medianCents)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {currency}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {hasData ? t("subsCount", { count: p.sampleSize }) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

async function EmptyState() {
  const t = await getTranslations("basket.empty");
  return (
    <main className="container mx-auto max-w-3xl px-4 py-24">
      <div className="rounded-md border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
        <div
          aria-hidden="true"
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <ShoppingBasket className="h-7 w-7" />
        </div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
          {t("title1")}{" "}
          <span className="italic text-primary">{t("titleAccent")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          {t("body")}
        </p>
        <Link
          href="/scan"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t("cta")}
        </Link>
      </div>
    </main>
  );
}
