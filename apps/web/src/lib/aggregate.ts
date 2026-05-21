/**
 * Server-only basket aggregation.
 *
 * Reads `PriceSubmitted` events from the active chain's PriceOracle and
 * folds them into a country-by-country snapshot of the Mercato basket.
 *
 * Pipeline:
 *   1. Identify which chain has a configured PriceOracle address.
 *   2. Pull events from the last LOOKBACK blocks (Celo runs ~1s blocks
 *      post-L2 migration, so 1M blocks ≈ 11.6 days). A single
 *      `eth_getLogs` covers this comfortably on Forno.
 *   3. Filter:
 *        - drop submissions whose barcode doesn't match any canonical
 *          Mercato product (legacy BeiBei EAN-13 submissions live in
 *          the same event log)
 *        - drop submissions whose zoneKey isn't Mercato-format
 *          (legacy GPS-encoded zones)
 *   4. Group by (country, product) and compute the median priceCents.
 *      Median > mean here because the launch sample is small and a
 *      single outlier (mistyped digit, currency confusion) would
 *      wreck a mean.
 *   5. Sum median product prices into per-country basket totals.
 *
 * Cached with `unstable_cache` (60s revalidate) so the landing and
 * `/basket` dashboard don't hit Forno on every request.
 */

import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicClient, http, type PublicClient } from "viem";
import { celo, celoSepolia } from "viem/chains";

import { ADDRESSES, priceOracleAbi } from "./contracts";
import {
  COUNTRIES,
  getCountryByCode,
  type Country,
} from "./countries";
import { productSlugToBarcode, zoneKeyToCountry } from "./encode";
import { PRODUCTS, getProductBySlug, type Product } from "./products";

/** Median price for a single product in a single country. */
export interface ProductPriceSummary {
  product: Product;
  /** Median price in the country's local currency, expressed in cents. */
  medianCents: bigint;
  /** Number of accepted submissions feeding this median. */
  sampleSize: number;
  /** Block timestamp (seconds) of the most recent contributing submission. */
  lastUpdated: number;
}

/** Aggregated cost-of-living snapshot for one country. */
export interface CountryBasket {
  country: Country;
  /** Sum of medianCents across all products with at least one submission. */
  totalLocalCents: bigint;
  /** Number of products with >= 1 submission (max = PRODUCTS.length). */
  coverage: number;
  /** Most recent contributing submission's block timestamp. */
  lastUpdated: number;
  /** Per-product breakdown, in PRODUCTS-declaration order. */
  prices: ProductPriceSummary[];
}

/** Full snapshot returned by `getBasketSnapshot`. */
export interface BasketSnapshot {
  countries: CountryBasket[];
  /** Unix seconds when the snapshot was assembled. */
  generatedAt: number;
  /** chainId the snapshot was sourced from. */
  chainId: number;
}

const RPC: Record<number, string> = {
  [celo.id]: "https://forno.celo.org",
  [celoSepolia.id]: "https://forno.celo-sepolia.celo-testnet.org/",
};

function getActiveChainId(): number | null {
  if (ADDRESSES[celo.id]?.priceOracle) return celo.id;
  if (ADDRESSES[celoSepolia.id]?.priceOracle) return celoSepolia.id;
  return null;
}

function buildClient(chainId: number): PublicClient {
  const chain = chainId === celo.id ? celo : celoSepolia;
  return createPublicClient({
    chain,
    transport: http(RPC[chainId]),
  }) as PublicClient;
}

/**
 * Pre-compute the bytes12 barcode for every canonical product so we can
 * filter incoming submissions in O(1). The map is barcode → product so
 * a matching event resolves to its product slug without re-hashing.
 */
const BARCODE_TO_PRODUCT: ReadonlyMap<string, Product> = new Map(
  PRODUCTS.map((p) => [productSlugToBarcode(p.slug).toLowerCase(), p]),
);

interface RawSubmission {
  product: Product;
  country: Country;
  priceCents: bigint;
  blockTimestamp: number;
}

/** Median of an array of bigints. Modifies a copy, not the input. */
function median(values: readonly bigint[]): bigint {
  if (values.length === 0) return 0n;
  const sorted = [...values].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2n;
  }
  return sorted[mid];
}

const LOOKBACK_BLOCKS = 1_000_000n;

/**
 * Inner cached fetch — assembles the full snapshot from on-chain events
 * and returns it. Cache key is constant; we don't allow per-caller
 * filtering inside the cache because that would shard the cache and
 * defeat the point.
 */
const fetchBasketSnapshot = unstable_cache(
  async (): Promise<BasketSnapshot> => {
    const chainId = getActiveChainId();
    if (chainId === null) {
      return {
        countries: [],
        generatedAt: Math.floor(Date.now() / 1000),
        chainId: 0,
      };
    }
    const address =
      ADDRESSES[chainId as keyof typeof ADDRESSES]?.priceOracle;
    if (!address) {
      return {
        countries: [],
        generatedAt: Math.floor(Date.now() / 1000),
        chainId,
      };
    }

    let submissions: RawSubmission[] = [];
    try {
      const client = buildClient(chainId);
      const latestBlock = await client.getBlockNumber();
      const fromBlock =
        latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;
      const logs = await client.getContractEvents({
        address,
        abi: priceOracleAbi,
        eventName: "PriceSubmitted",
        fromBlock,
        toBlock: "latest",
      });

      submissions = logs.flatMap((log) => {
        const args = log.args as {
          barcode?: `0x${string}`;
          zoneKey?: `0x${string}`;
          priceCents?: bigint;
          timestamp?: bigint;
        };
        const { barcode, zoneKey, priceCents, timestamp } = args;
        if (!barcode || !zoneKey || priceCents === undefined) return [];
        const product = BARCODE_TO_PRODUCT.get(barcode.toLowerCase());
        if (!product) return [];
        const countryCode = zoneKeyToCountry(zoneKey);
        if (!countryCode) return [];
        const country = getCountryByCode(countryCode);
        if (!country) return [];
        return [
          {
            product,
            country,
            priceCents,
            blockTimestamp: Number(timestamp ?? 0n),
          } satisfies RawSubmission,
        ];
      });
    } catch {
      // Public RPC hiccup — return an empty snapshot rather than 500.
      submissions = [];
    }

    const countries = aggregateByCountry(submissions);
    return {
      countries,
      generatedAt: Math.floor(Date.now() / 1000),
      chainId,
    };
  },
  ["mercato-basket-snapshot-v1"],
  { revalidate: 60, tags: ["basket"] },
);

/**
 * Fold raw submissions into per-country baskets. Iterates `COUNTRIES`
 * declaration order so the dashboard renders deterministically (and
 * empty countries still appear in the list).
 */
function aggregateByCountry(
  submissions: readonly RawSubmission[],
): CountryBasket[] {
  // First bucket by countryCode → productSlug → bigint[]
  const byCountry: Map<string, Map<string, bigint[]>> = new Map();
  const lastSeen: Map<string, Map<string, number>> = new Map();

  for (const sub of submissions) {
    const cc = sub.country.code;
    const slug = sub.product.slug;
    let perProduct = byCountry.get(cc);
    if (!perProduct) {
      perProduct = new Map();
      byCountry.set(cc, perProduct);
      lastSeen.set(cc, new Map());
    }
    const arr = perProduct.get(slug);
    if (arr) arr.push(sub.priceCents);
    else perProduct.set(slug, [sub.priceCents]);
    const lastMap = lastSeen.get(cc)!;
    const prev = lastMap.get(slug) ?? 0;
    if (sub.blockTimestamp > prev) lastMap.set(slug, sub.blockTimestamp);
  }

  return COUNTRIES.map((country): CountryBasket => {
    const perProduct = byCountry.get(country.code);
    const tsMap = lastSeen.get(country.code);
    const prices: ProductPriceSummary[] = PRODUCTS.map((product) => {
      const samples = perProduct?.get(product.slug) ?? [];
      return {
        product,
        medianCents: median(samples),
        sampleSize: samples.length,
        lastUpdated: tsMap?.get(product.slug) ?? 0,
      };
    });
    const totalLocalCents = prices.reduce(
      (acc, p) => acc + (p.sampleSize > 0 ? p.medianCents : 0n),
      0n,
    );
    const coverage = prices.filter((p) => p.sampleSize > 0).length;
    const lastUpdated = prices.reduce(
      (acc, p) => (p.lastUpdated > acc ? p.lastUpdated : acc),
      0,
    );
    return {
      country,
      totalLocalCents,
      coverage,
      lastUpdated,
      prices,
    };
  });
}

/**
 * Public accessor — returns the cached snapshot. Cheap to call on
 * every page render thanks to `unstable_cache`.
 */
export async function getBasketSnapshot(): Promise<BasketSnapshot> {
  return fetchBasketSnapshot();
}

/**
 * Just the basket for one country (or null if the country isn't in our
 * launch list). Reads from the same cached snapshot so this composes
 * cheaply with `getBasketSnapshot`.
 */
export async function getCountryBasket(
  countryCode: string,
): Promise<CountryBasket | null> {
  const snapshot = await fetchBasketSnapshot();
  const upper = countryCode.toUpperCase();
  return (
    snapshot.countries.find((b) => b.country.code === upper) ?? null
  );
}

/**
 * Look up a Product by its bytes12 barcode (the same hash that's used
 * on-chain). Useful for resolving event logs to product names in the
 * activity feed.
 */
export function getProductByBarcode(barcode: string): Product | undefined {
  return BARCODE_TO_PRODUCT.get(barcode.toLowerCase());
}

// Re-export so consumers don't import from products.ts separately.
export { getProductBySlug };
