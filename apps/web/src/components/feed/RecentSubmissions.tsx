"use client";

import Link from "next/link";
import { useChainId } from "wagmi";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { zoneKeyToGps } from "@/lib/zone";
import { findSeedLabel } from "@/lib/seed-labels";

const MAX_ROWS = 8;

export function RecentSubmissions() {
  const chainId = useChainId();
  const { records, loading } = usePriceFeed(chainId);

  if (loading && records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading submissions…
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No submissions yet — be the first to scan a price.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y text-sm">
          {records.slice(0, MAX_ROWS).map((r) => {
            const zone = safeZone(r.zoneKey);
            const meta = findSeedLabel(r.barcode);
            return (
              <li
                key={r.submissionId.toString()}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  {meta ? (
                    <>
                      <Link
                        href={`/item/${r.barcode}`}
                        className="block truncate font-medium hover:underline"
                      >
                        <span aria-hidden="true">{meta.flag}</span>{" "}
                        {meta.label}
                      </Link>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {meta.city}
                      </p>
                    </>
                  ) : (
                    <Link
                      href={`/item/${r.barcode}`}
                      className="block truncate font-mono text-xs hover:underline"
                    >
                      {r.barcode}
                    </Link>
                  )}
                </div>
                <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                  <p className="text-base font-semibold tracking-tight">
                    {(Number(r.priceCents) / 100).toFixed(2)}
                    {meta ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {meta.currency}
                      </span>
                    ) : null}
                  </p>
                  <div className="text-right text-[11px] text-muted-foreground">
                    {zone ? (
                      <p>
                        {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}
                      </p>
                    ) : null}
                    <p>
                      {r.finalized
                        ? r.accepted
                          ? "✓ accepted"
                          : "✗ rejected"
                        : `pending ${r.totalVotes}/3`}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function safeZone(zoneKey: `0x${string}`) {
  try {
    return zoneKeyToGps(zoneKey);
  } catch {
    return null;
  }
}
