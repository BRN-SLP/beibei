"use client";

import Link from "next/link";
import { useChainId } from "wagmi";

import { Card, CardContent } from "@/components/ui/card";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { getCountryByCode } from "@/lib/countries";
import { productSlugToBarcode, zoneKeyToCountry } from "@/lib/encode";
import { PRODUCTS, type Product } from "@/lib/products";

const MAX_ROWS = 8;

/**
 * Resolve a bytes12 barcode (as hex) back to a canonical Mercato
 * product. Built once at module load so subsequent lookups are O(1).
 */
const PRODUCT_BY_BARCODE: ReadonlyMap<string, Product> = new Map(
  PRODUCTS.map((p) => [productSlugToBarcode(p.slug).toLowerCase(), p]),
);

interface FeedRow {
  submissionId: number;
  barcode: `0x${string}`;
  product: Product;
  country: NonNullable<ReturnType<typeof getCountryByCode>>;
  priceCents: number;
  finalized: boolean;
  accepted: boolean;
  totalVotes: number;
}

/**
 * Live feed of Mercato submissions, hydrated from on-chain events
 * via `usePriceFeed`. Legacy non-Mercato submissions (EAN-13 barcodes,
 * GPS-encoded zoneKeys from earlier experiments on the same contract)
 * are filtered out — we only surface rows that resolve cleanly to a
 * (product, country) pair.
 *
 * Empty state ships a "be the first" message that bottoms out the
 * landing page's narrative arc: read about the index, look at the
 * country preview, see the feed is hungry, jump to /scan.
 */
export function RecentSubmissions() {
  const chainId = useChainId();
  const { records, loading } = usePriceFeed(chainId);

  // Filter + reshape — drop anything that doesn't look like Mercato.
  const rows: FeedRow[] = [];
  for (const r of records) {
    const product = PRODUCT_BY_BARCODE.get(r.barcode.toLowerCase());
    if (!product) continue;
    const countryCode = zoneKeyToCountry(r.zoneKey);
    if (!countryCode) continue;
    const country = getCountryByCode(countryCode);
    if (!country) continue;
    rows.push({
      submissionId: r.submissionId,
      barcode: r.barcode,
      product,
      country,
      priceCents: r.priceCents,
      finalized: r.finalized,
      accepted: r.accepted,
      totalVotes: r.totalVotes,
    });
    if (rows.length >= MAX_ROWS) break;
  }

  if (loading && rows.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading the feed…
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-card/40">
        <CardContent className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            The feed is quiet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            No Mercato submissions yet.{" "}
            <Link
              href="/scan"
              className="font-medium text-primary hover:underline"
            >
              Add the first price →
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60 text-sm">
          {rows.map((row) => (
            <FeedItem key={row.submissionId.toString()} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FeedItem({ row }: { row: FeedRow }) {
  const major = (row.priceCents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  // Status — kept as plain mono caps. The earlier "✓ accepted" / "✗
  // rejected" pseudo-icons read as emoji noise in this register, so
  // we drop them and let the colored dot carry the semantic weight.
  const status = row.finalized
    ? row.accepted
      ? { label: "accepted", tone: "bg-emerald-500/80" }
      : { label: "rejected", tone: "bg-destructive/80" }
    : { label: `pending · ${row.totalVotes}/3`, tone: "bg-amber-500/80" };

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-4">
      {/* Country code pill — replaces emoji flag */}
      <Link
        href={`/item/${row.barcode}`}
        className="inline-flex h-8 w-11 items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono text-[11px] font-semibold tracking-[0.18em] text-foreground/80 transition-colors hover:border-primary/50 hover:text-primary"
        aria-label={row.country.name}
      >
        {row.country.code}
      </Link>

      {/* Product + country meta */}
      <div className="min-w-0">
        <Link
          href={`/item/${row.barcode}`}
          className="font-medium hover:underline"
        >
          <span className="truncate">{row.product.label}</span>
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {row.country.name}
        </p>
      </div>

      {/* Price + status */}
      <div className="flex flex-col items-end gap-0.5">
        <p className="font-mono text-base font-semibold tabular-nums">
          {major}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {row.country.currency}
          </span>
        </p>
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${status.tone}`}
          />
          {status.label}
        </p>
      </div>
    </li>
  );
}
