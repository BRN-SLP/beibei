import Link from "next/link";
import { Barcode, Home, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Item not found",
};

/**
 * Item-specific 404. Reached when:
 *   - the `[barcode]` path segment isn't a valid 12-byte hex string with
 *     a 0x prefix, or
 *   - the barcode is well-formed but no on-chain submissions exist for
 *     it yet (so there's nothing to render in the feed).
 *
 * Copy is tuned to the per-item context rather than a generic 'page not
 * found' so users know exactly what went wrong.
 */
export default function ItemNotFound() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div
        aria-hidden="true"
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary"
      >
        <Barcode className="h-7 w-7" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        404 · Item
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
        Couldn&apos;t open this item.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
        Either the barcode in the URL is malformed (we expect 12 bytes of
        hex with a 0x prefix), or no one has submitted a price for it yet.
        Scan it yourself to start the feed.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/scan">
            <ScanLine className="mr-2 h-4 w-4" />
            Scan a price
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  );
}
