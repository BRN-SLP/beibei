import Link from "next/link";
import { Home, ScanLine, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
};

/**
 * Root 404. Reached when the requested URL doesn't match any route or
 * a route calls `notFound()` and no nested `not-found.tsx` is provided.
 * Item-specific 404 lives at /item/[barcode]/not-found.tsx and takes
 * over for invalid / unknown barcodes.
 */
export default function NotFound() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div
        aria-hidden="true"
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary"
      >
        <ScanLine className="h-7 w-7" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
        No reading here.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
        The page you were looking for either moved, was never published, or
        the link picked up a typo on its way over. The fastest way back is
        to scan something or head home.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/scan">
            <Search className="mr-2 h-4 w-4" />
            Scan a price
          </Link>
        </Button>
      </div>
    </main>
  );
}
