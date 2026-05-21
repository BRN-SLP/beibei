import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getRecentFeed, type FeedRow } from "@/lib/recent-feed";

const ROW_HEIGHT_CLASS = "min-h-[68px]";
const MAX_ROWS = 8;

/**
 * Live feed of Mercato submissions, server-rendered from on-chain
 * events via `getRecentFeed`. Used to be a client component that
 * mounted empty and swapped to filled rows after RPC, which was the
 * landing page's biggest CLS contributor — the swap moved ~500px
 * of content. Now the HTML ships pre-filled and there's nothing to
 * reflow after hydration.
 *
 * Empty state ships a "be the first" message that bottoms out the
 * landing page's narrative arc.
 */
export async function RecentSubmissions() {
  const rows = await getRecentFeed(MAX_ROWS);

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
    <li
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-4 ${ROW_HEIGHT_CLASS}`}
    >
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
