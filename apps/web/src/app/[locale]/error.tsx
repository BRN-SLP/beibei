"use client";

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root error boundary. Catches uncaught errors thrown anywhere inside
 * the app's rendering tree that the framework wasn't able to handle.
 * Provides a branded fallback + a reset button (Next.js re-renders the
 * segment on click) and a way back home.
 *
 * `digest` is the production-only error fingerprint Next.js logs to the
 * server; surfacing it lets us correlate user reports with server logs
 * without exposing stack traces in the UI.
 */
export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Surface in the browser console so users can copy it into a bug
    // report. In production Next.js strips the message and exposes only
    // `digest`; that's still useful for correlation.
    // eslint-disable-next-line no-console
    console.error("[Mercato] uncaught render error:", error);
  }, [error]);

  return (
    <main className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div
        aria-hidden="true"
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/5 text-destructive"
      >
        <AlertTriangle className="h-7 w-7" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Unexpected error
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
        The feed glitched.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
        We hit an unhandled error rendering this page. Try refreshing, most
        of the time the underlying state has already recovered.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
          error id · {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button size="lg" onClick={() => reset()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
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
