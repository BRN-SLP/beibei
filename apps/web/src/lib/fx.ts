/**
 * FX rates source — Frankfurter.app.
 *
 * Why Frankfurter:
 *   - Free, no API key, no auth header. Public good run on top of the
 *     European Central Bank reference rates.
 *   - Covers every currency we touch today (UAH, EUR, BRL, GBP, TRY,
 *     ARS, USD, PLN, NGN, KES, PHP, JPY, CHF) plus all common bases.
 *   - Returns daily snapshots — appropriate for a cost-of-living index
 *     where the input data updates on a daily-or-slower cadence anyway.
 *
 * Cached via `unstable_cache` with a 1-hour TTL — same revalidation
 * heuristic as `getBasketSnapshot` and aligned with Frankfurter's own
 * daily-update cadence (no point hitting the upstream more frequently
 * than its source data changes).
 *
 * Reliability: if Frankfurter is down, the cached prior response keeps
 * serving until the cache key naturally expires. If the cache is also
 * cold, the helper returns an empty rate map and downstream code falls
 * back to "—" instead of throwing.
 */
import "server-only";

import { unstable_cache } from "next/cache";

export type FxBase = "USD" | "EUR";

export interface FxRates {
  base: FxBase;
  /** ISO 4217 code → 1 unit of base in that currency. e.g. USD base, KES rate ≈ 129 means $1 = 129 KES. */
  rates: Record<string, number>;
  /** ISO date string from Frankfurter, e.g. "2026-05-21". */
  date: string;
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

async function fetchFromFrankfurter(base: FxBase): Promise<FxRates> {
  const url = `https://api.frankfurter.dev/v1/latest?base=${base}`;
  const res = await fetch(url, {
    // Server-side fetch only; no need for CORS / credentials.
    headers: { Accept: "application/json" },
    // Disable Next.js HTTP cache here — we manage caching via
    // unstable_cache on the wrapper below.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Frankfurter HTTP ${res.status}`);
  }
  const json = (await res.json()) as FrankfurterResponse;
  return {
    base,
    rates: { ...json.rates, [base]: 1 },
    date: json.date,
  };
}

/**
 * Cached USD rate sheet. Always 1 hour TTL — Frankfurter publishes
 * daily, so polling faster is wasted bandwidth. Cache key includes
 * the base so USD and EUR get independent cache entries.
 */
const fetchUsd = unstable_cache(
  () => fetchFromFrankfurter("USD"),
  ["fx-rates-usd-v1"],
  { revalidate: 3600, tags: ["fx"] },
);

const fetchEur = unstable_cache(
  () => fetchFromFrankfurter("EUR"),
  ["fx-rates-eur-v1"],
  { revalidate: 3600, tags: ["fx"] },
);

/**
 * Return both rate sheets — pre-fetching both means the client
 * toggle between USD and EUR doesn't trigger a re-fetch.
 */
export async function getFxRatesBoth(): Promise<{
  usd: FxRates | null;
  eur: FxRates | null;
}> {
  const [usd, eur] = await Promise.allSettled([fetchUsd(), fetchEur()]);
  return {
    usd: usd.status === "fulfilled" ? usd.value : null,
    eur: eur.status === "fulfilled" ? eur.value : null,
  };
}

/**
 * Convert a local-currency amount (cents) to a base-currency amount
 * (also in cents). Returns null if the rate for that currency isn't
 * available — caller is expected to render "—" or hide the row.
 *
 *   localCents:  e.g. 5200n for 52.00 UAH
 *   localCurrency: ISO 4217 — "UAH"
 *   rates:       FxRates with base "USD"
 *
 *   → returns ~125 (meaning 1.25 USD cents-equivalent... wait, no:
 *     52 UAH ÷ 41 (UAH/USD) ≈ 1.27 USD = 127 cents)
 *
 * Math walk-through with base=USD, rates.UAH = 41.5:
 *   localCents = 5200 (52.00 UAH)
 *   localMajor = 52.00
 *   baseMajor = 52.00 / 41.5 = 1.2530
 *   baseCents = round(1.2530 * 100) = 125
 */
export function convertCents(
  localCents: bigint,
  localCurrency: string,
  rates: FxRates,
): number | null {
  const rate = rates.rates[localCurrency.toUpperCase()];
  if (!rate || rate <= 0) return null;
  // Use Number for the division — JS bigint can't do float math, and
  // we're heading to cents-precision anyway. Up to ~2^53 cents is
  // ~$90 trillion, more than enough for a basket of groceries.
  const localMajor = Number(localCents) / 100;
  const baseMajor = localMajor / rate;
  return Math.round(baseMajor * 100);
}
