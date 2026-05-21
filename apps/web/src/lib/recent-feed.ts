/**
 * Server-only recent-submissions feed + hero stat counts.
 *
 * The landing page's feed list (`RecentSubmissions`) and stats line
 * (`HeroStats`) used to be client components that pulled events
 * through `usePriceFeed` on mount, swapping placeholder UI for
 * filled UI once the RPC came back. That swap was the biggest CLS
 * contributor on the landing page (~500px shift). We move the
 * initial fetch to the server, render in HTML, and avoid the jump.
 *
 * The full PriceSubmitted + Verified + SubmissionFinalized pipeline
 * is replayed here so finalize state, vote counts, and hero stats
 * are accurate on first paint. Both fetchers share one cached scan
 * to keep RPC pressure flat.
 */

import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import { celo, celoSepolia } from "viem/chains";

import {
  priceCentsFromChain,
  submissionIdFromChain,
  timestampFromChain,
} from "./chain-boundary";
import { ADDRESSES, priceOracleAbi } from "./contracts";
import {
  getCountryByCode,
  type Country,
} from "./countries";
import { productSlugToBarcode, zoneKeyToCountry } from "./encode";
import { PRODUCTS, type Product } from "./products";

/**
 * A single row in the landing feed. `barcode` is the on-chain hex so
 * the row can deep-link into `/item/[barcode]` without a second
 * lookup at render time.
 */
export interface FeedRow {
  submissionId: number;
  barcode: `0x${string}`;
  product: Product;
  country: Country;
  priceCents: number;
  finalized: boolean;
  accepted: boolean;
  totalVotes: number;
  /** Block timestamp (seconds) — used for sorting newest first. */
  timestamp: number;
}

/** Aggregate counts surfaced by the hero stats line. */
export interface FeedStats {
  /** Submissions that finished consensus and were accepted. */
  finalized: number;
  /** Distinct countries with ≥ 1 accepted submission. */
  countries: number;
  /** Submissions still awaiting verifier votes. */
  pending: number;
}

interface FeedSnapshot {
  rows: readonly FeedRow[];
  stats: FeedStats;
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

/** Barcode → Product lookup for filtering legacy non-Mercato events. */
const BARCODE_TO_PRODUCT: ReadonlyMap<string, Product> = new Map(
  PRODUCTS.map((p) => [productSlugToBarcode(p.slug).toLowerCase(), p]),
);

/** Same lookback used by the snapshot fetcher — keep the two
 *  consistent so the landing feed and the basket index see the
 *  same on-chain window. */
const LOOKBACK_BLOCKS = 1_000_000n;

interface PriceSubmittedArgs {
  submissionId?: bigint;
  barcode?: Hex;
  zoneKey?: Hex;
  priceCents?: bigint;
  timestamp?: bigint;
}

interface VerifiedArgs {
  submissionId?: bigint;
  isValid?: boolean;
}

interface FinalizedArgs {
  submissionId?: bigint;
  accepted?: boolean;
}

const EMPTY_STATS: FeedStats = { finalized: 0, countries: 0, pending: 0 };

const fetchFeedSnapshot = unstable_cache(
  async (): Promise<FeedSnapshot> => {
    const chainId = getActiveChainId();
    if (chainId === null) return { rows: [], stats: EMPTY_STATS };
    const address =
      ADDRESSES[chainId as keyof typeof ADDRESSES]?.priceOracle;
    if (!address) return { rows: [], stats: EMPTY_STATS };

    const client = buildClient(chainId);

    try {
      const latestBlock = await client.getBlockNumber();
      const fromBlock =
        latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

      const [submittedLogs, verifiedLogs, finalizedLogs] = await Promise.all([
        client.getContractEvents({
          address,
          abi: priceOracleAbi,
          eventName: "PriceSubmitted",
          fromBlock,
          toBlock: "latest",
        }),
        client.getContractEvents({
          address,
          abi: priceOracleAbi,
          eventName: "Verified",
          fromBlock,
          toBlock: "latest",
        }),
        client.getContractEvents({
          address,
          abi: priceOracleAbi,
          eventName: "SubmissionFinalized",
          fromBlock,
          toBlock: "latest",
        }),
      ]);

      const byId = new Map<string, FeedRow>();
      for (const log of submittedLogs) {
        const args = log.args as PriceSubmittedArgs;
        if (
          args.submissionId === undefined ||
          !args.barcode ||
          !args.zoneKey ||
          args.priceCents === undefined
        ) {
          continue;
        }
        const product = BARCODE_TO_PRODUCT.get(args.barcode.toLowerCase());
        if (!product) continue;
        const countryCode = zoneKeyToCountry(args.zoneKey);
        if (!countryCode) continue;
        const country = getCountryByCode(countryCode);
        if (!country) continue;

        const submissionId = submissionIdFromChain(args.submissionId);
        byId.set(submissionId.toString(), {
          submissionId,
          barcode: args.barcode,
          product,
          country,
          priceCents: priceCentsFromChain(args.priceCents),
          finalized: false,
          accepted: false,
          totalVotes: 0,
          timestamp: timestampFromChain(args.timestamp),
        });
      }

      for (const log of verifiedLogs) {
        const args = log.args as VerifiedArgs;
        if (args.submissionId === undefined) continue;
        const key = submissionIdFromChain(args.submissionId).toString();
        const row = byId.get(key);
        if (!row) continue;
        row.totalVotes += 1;
      }

      for (const log of finalizedLogs) {
        const args = log.args as FinalizedArgs;
        if (args.submissionId === undefined) continue;
        const key = submissionIdFromChain(args.submissionId).toString();
        const row = byId.get(key);
        if (!row) continue;
        row.finalized = true;
        row.accepted = Boolean(args.accepted);
      }

      const all = [...byId.values()].sort(
        (a, b) => b.timestamp - a.timestamp,
      );

      let finalized = 0;
      let pending = 0;
      const countrySet = new Set<string>();
      for (const r of all) {
        if (r.finalized && r.accepted) {
          finalized++;
          countrySet.add(r.country.code);
        } else if (!r.finalized) {
          pending++;
        }
      }

      return {
        rows: all,
        stats: {
          finalized,
          countries: countrySet.size,
          pending,
        },
      };
    } catch {
      // Public RPC hiccup — render empty rather than 500.
      return { rows: [], stats: EMPTY_STATS };
    }
  },
  ["mercato-feed-snapshot-v1"],
  { revalidate: 60, tags: ["basket", "feed"] },
);

/**
 * Top `limit` rows of the feed (newest first).
 */
export async function getRecentFeed(limit = 8): Promise<readonly FeedRow[]> {
  const snap = await fetchFeedSnapshot();
  return snap.rows.slice(0, limit);
}

/**
 * Hero stats counts derived from the same scanned window.
 */
export async function getFeedStats(): Promise<FeedStats> {
  const snap = await fetchFeedSnapshot();
  return snap.stats;
}
