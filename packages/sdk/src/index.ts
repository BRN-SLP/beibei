/**
 * @mercato/sdk — public read helpers for the Mercato price oracle on Celo.
 *
 * The contract is event-driven: PriceSubmitted + Verified + SubmissionFinalized
 * events are the source of truth. This SDK aggregates them into a single
 * "what is the current median price for barcode X in zone Y" view that any
 * dapp can drop into their UI.
 *
 * Usage:
 *
 * ```ts
 * import { createPublicClient, http } from "viem";
 * import { celo } from "viem/chains";
 * import { getMedianPrice, barcodeStringToHex, gpsToZoneKey } from "@mercato/sdk";
 *
 * const client = createPublicClient({ chain: celo, transport: http() });
 * const median = await getMedianPrice({
 *   publicClient: client,
 *   oracleAddress: "0x...",
 *   barcode: barcodeStringToHex("0123456789012"),
 *   zoneKey: gpsToZoneKey(0.31, 32.58), // optional
 * });
 * console.log(median); // { priceCents: 459, sampleSize: 12 } | null
 * ```
 */

import type { Address, Hex, PublicClient } from "viem";

import { priceOracleAbi } from "./abi.js";
import { weightedMedian } from "./median.js";
import { barcodeStringToHex } from "./barcode.js";
import { gpsToZoneKey, zoneKeyToGps } from "./zone.js";

export { priceOracleAbi } from "./abi.js";
export { weightedMedian, dailyMedianSeries } from "./median.js";
export type { PriceObservation } from "./median.js";
export { barcodeStringToHex } from "./barcode.js";
export { gpsToZoneKey, zoneKeyToGps } from "./zone.js";

export interface GetMedianPriceParams {
  publicClient: PublicClient;
  oracleAddress: Address;
  barcode: Hex;
  zoneKey?: Hex;
  /** Block to start scanning from. Defaults to genesis. */
  fromBlock?: bigint;
}

export interface MedianPriceResult {
  priceCents: number;
  sampleSize: number;
}

/**
 * Aggregate every accepted submission for a (barcode[, zoneKey]) pair and
 * return the weighted-median price.
 */
export async function getMedianPrice(
  params: GetMedianPriceParams,
): Promise<MedianPriceResult | null> {
  const { publicClient, oracleAddress, barcode, zoneKey, fromBlock } = params;

  const [submittedLogs, finalizedLogs] = await Promise.all([
    publicClient.getContractEvents({
      address: oracleAddress,
      abi: priceOracleAbi,
      eventName: "PriceSubmitted",
      args: zoneKey ? { barcode, zoneKey } : { barcode },
      fromBlock: fromBlock ?? 0n,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: oracleAddress,
      abi: priceOracleAbi,
      eventName: "SubmissionFinalized",
      fromBlock: fromBlock ?? 0n,
      toBlock: "latest",
    }),
  ]);

  const accepted = new Set<string>();
  for (const log of finalizedLogs) {
    const args = (log as { args?: { submissionId?: bigint; accepted?: boolean } }).args;
    if (args?.submissionId !== undefined && args.accepted) {
      accepted.add(args.submissionId.toString());
    }
  }

  const observations = submittedLogs
    .map((log) => {
      const args = (
        log as {
          args?: {
            submissionId?: bigint;
            priceCents?: bigint;
            timestamp?: bigint;
          };
        }
      ).args;
      if (
        args?.submissionId === undefined ||
        args.priceCents === undefined ||
        args.timestamp === undefined
      ) {
        return null;
      }
      if (!accepted.has(args.submissionId.toString())) return null;
      return {
        priceCents: Number(args.priceCents),
        timestampSeconds: Number(args.timestamp),
      };
    })
    .filter((o): o is { priceCents: number; timestampSeconds: number } => o !== null);

  if (observations.length === 0) return null;
  const median = weightedMedian(observations);
  if (median === null) return null;
  return { priceCents: median, sampleSize: observations.length };
}
