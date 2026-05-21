/**
 * Core basket — the strict subset of products used for cross-country
 * ranking on the hero.
 *
 * Why a strict subset and not the full 33-product basket: comparing
 * countries by their total basket sum isn't honest if Kenya has 3
 * priced products and Germany has 8 — Germany would look "more
 * expensive" purely because it has more line items, not because life
 * is actually more expensive there.
 *
 * The strict core is the smallest set that's available in every
 * country we currently rank: bread, milk, one-way public transport.
 * It's also the set Numbeo, Big Mac index, and World Bank ICP all
 * gravitate toward for the same reason — these three goods exist in
 * recognizable form in every economy on the planet, and they cover
 * three different demand categories (carbs, dairy, mobility).
 *
 * When we add coffee_cappuccino_cafe or apartment_rent_1br across all
 * 15 countries, expand this list. Keep the list small and universal —
 * its job is to be a comparable basket, not a comprehensive one.
 */

import { getCountryByCode } from "./countries";
import type { CountryBasket } from "./aggregate";
import type { FxRates } from "./fx";
import { convertCents } from "./fx";

/**
 * The strict-core product slugs, in display order. Must match real
 * slugs in `lib/products.ts`. Order is "consumed daily" → "consumed
 * weekly/monthly" — bread + milk every day, transport every weekday.
 */
export const CORE_BASKET_SLUGS = [
  "bread_500g",
  "milk_1l",
  "public_transport_oneway",
] as const;

export type CoreBasketSlug = (typeof CORE_BASKET_SLUGS)[number];

/**
 * A country's core basket value, expressed in a single base currency.
 * `baseCents` is null when at least one core product is missing for
 * this country — we don't approximate, we drop the row.
 */
export interface CoreBasketEntry {
  countryCode: string;
  countryName: string;
  /** Core basket sum in base-currency cents (USD or EUR per the
   *  `rates.base` of the FxRates the caller passed in). */
  baseCents: number;
  /** Number of core products this country has data for (0..3). */
  filled: number;
  /** All three filled? */
  complete: boolean;
}

/**
 * Project the on-chain country baskets onto the core-basket subset
 * and convert into the given base currency.
 *
 * Returns only countries with complete data (all 3 core products
 * priced), sorted ascending by base-currency cost (cheapest first —
 * the user's first instinct on a cost-of-living index is to find
 * where life is most affordable).
 */
export function rankCoreBasket(
  countries: readonly CountryBasket[],
  rates: FxRates,
): CoreBasketEntry[] {
  const entries: CoreBasketEntry[] = [];

  for (const basket of countries) {
    const country = getCountryByCode(basket.country.code);
    if (!country) continue;

    let baseCents = 0;
    let filled = 0;
    let ok = true;
    for (const slug of CORE_BASKET_SLUGS) {
      const entry = basket.prices.find((p) => p.product.slug === slug);
      if (!entry || entry.sampleSize === 0) continue;
      const converted = convertCents(entry.medianCents, country.currency, rates);
      if (converted === null) {
        ok = false;
        break;
      }
      baseCents += converted;
      filled++;
    }

    // For now we only rank countries with the COMPLETE core. Partial
    // rows clutter the comparison and are exactly what the strict-core
    // choice was supposed to filter out.
    if (!ok || filled !== CORE_BASKET_SLUGS.length) continue;

    entries.push({
      countryCode: country.code,
      countryName: country.name,
      baseCents,
      filled,
      complete: true,
    });
  }

  return entries.sort((a, b) => a.baseCents - b.baseCents);
}
