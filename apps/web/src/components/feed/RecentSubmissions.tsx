import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CountryMark } from "@/components/brand/CountryMark";
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
  const [rows, t, tp] = await Promise.all([
    getRecentFeed(MAX_ROWS),
    getTranslations("feed"),
    getTranslations("products"),
  ]);

  if (rows.length === 0) {
    return (
      <div className="border-y border-dashed border-border/80 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("emptyTitle")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("emptyBody")}{" "}
          <Link
            href="/scan"
            className="font-medium text-primary hover:underline"
          >
            {t("emptyCta")}
          </Link>
        </p>
      </div>
    );
  }

  // Build per-row status label up-front so FeedItem stays sync.
  // No card chrome on the list, divide-y handles inter-row rhythm
  // and the section's own type already frames the feed editorially.
  return (
    <ul className="divide-y divide-border/60 border-y border-border/60 text-sm">
      {rows.map((row) => {
        const statusLabel = row.finalized
          ? row.accepted
            ? t("accepted")
            : t("rejected")
          : t("pending", { votes: row.totalVotes });
        return (
          <FeedItem
            key={row.submissionId.toString()}
            row={row}
            statusLabel={statusLabel}
            productLabel={tp(`${row.product.slug}.label`)}
          />
        );
      })}
    </ul>
  );
}

function FeedItem({
  row,
  statusLabel,
  productLabel,
}: {
  row: FeedRow;
  statusLabel: string;
  productLabel: string;
}) {
  const major = (row.priceCents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  // Status tone — kept as plain mono caps with a colored dot. The
  // earlier "✓ accepted" / "✗ rejected" pseudo-icons read as emoji
  // noise in this register, so the dot carries the semantic weight.
  const tone = row.finalized
    ? row.accepted
      ? "bg-emerald-500/80"
      : "bg-destructive/80"
    : "bg-amber-500/80";

  return (
    <li
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-4 ${ROW_HEIGHT_CLASS}`}
    >
      {/* Country mark — desaturated SVG flag + ISO pill.
          The whole element wraps in a Link so the row deep-links
          into the item page. */}
      <Link
        href={`/item/${row.barcode}`}
        className="inline-flex items-center transition-opacity hover:opacity-80"
        aria-label={row.country.name}
      >
        <CountryMark code={row.country.code} size="md" />
      </Link>

      {/* Product + country meta */}
      <div className="min-w-0">
        <Link
          href={`/item/${row.barcode}`}
          className="font-medium hover:underline"
        >
          <span className="truncate">{productLabel}</span>
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
            className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`}
          />
          {statusLabel}
        </p>
      </div>
    </li>
  );
}
