/**
 * Cookie-backed FX base selector.
 *
 * The user chooses between three display modes for every price on
 * the site:
 *
 *   - "local" (default): show each price in the country's native
 *     currency, e.g. UAH for Ukraine, GBP for the UK.
 *   - "USD": convert every price into US dollars via the cached
 *     Frankfurter rate sheet.
 *   - "EUR": same, into euros.
 *
 * Choice persists in a cookie so it survives navigation across
 * server-rendered pages without making every page accept a query
 * param. Cookie reads are server-only, the toggle widget writes
 * via document.cookie and triggers a router refresh.
 */
import "server-only";

import { cookies } from "next/headers";

import {
  convertCents,
  getFxRatesBoth,
  type FxRates,
} from "./fx";

export type FxBase = "local" | "USD" | "EUR";

export const FX_BASE_COOKIE = "mercato-fx-base";

/**
 * Read the user's selected FX base from the request cookies.
 * Falls back to "local" when no preference has been set.
 */
export async function getFxBase(): Promise<FxBase> {
  const value = (await cookies()).get(FX_BASE_COOKIE)?.value;
  if (value === "USD" || value === "EUR") return value;
  return "local";
}

/**
 * For a given FX base, return the matching rate sheet, or null if
 * the base is "local" or the upstream FX provider was unreachable.
 */
export async function getActiveFxRates(
  base: FxBase,
): Promise<FxRates | null> {
  if (base === "local") return null;
  const fx = await getFxRatesBoth();
  return base === "USD" ? fx.usd : fx.eur;
}

/**
 * Render-time helper: given a local price + the active base, return
 * either the converted cents + base currency code, or the original
 * cents + original currency code. Falls back to the original when
 * the rate for that local currency is missing.
 */
export function applyFxBase(
  localCents: number,
  localCurrency: string,
  base: FxBase,
  rates: FxRates | null,
): { cents: number; currency: string } {
  if (base === "local" || !rates) {
    return { cents: localCents, currency: localCurrency };
  }
  const converted = convertCents(localCents, localCurrency, rates);
  if (converted === null) {
    return { cents: localCents, currency: localCurrency };
  }
  return { cents: converted, currency: base };
}
