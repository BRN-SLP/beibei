"use client";

import { useEffect, useMemo, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import type { Hex, Log } from "viem";

import { getPriceOracleAddress, priceOracleAbi } from "@/lib/contracts";

export interface SubmissionRecord {
  submissionId: bigint;
  barcode: Hex;
  zoneKey: Hex;
  submitter: `0x${string}`;
  priceCents: bigint;
  receiptHash: Hex;
  timestamp: bigint;
  finalized: boolean;
  accepted: boolean;
  acceptVotes: number;
  rejectVotes: number;
  totalVotes: number;
}

interface PriceFeedOptions {
  /** Optional barcode filter. When omitted, returns the whole feed. */
  barcode?: Hex;
}

/**
 * Aggregate PriceSubmitted + Verified + SubmissionFinalized events into a
 * coherent list of submissions with current vote state. Sorted newest first.
 */
export function usePriceFeed(
  chainId: number | undefined,
  options: PriceFeedOptions = {},
) {
  const publicClient = usePublicClient({ chainId });
  const oracleAddress = useMemo(() => {
    if (chainId === undefined) return undefined;
    try {
      return getPriceOracleAddress(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const [records, setRecords] = useState<Map<string, SubmissionRecord>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicClient || !oracleAddress) {
        setLoading(false);
        return;
      }
      try {
        // Forno (and most public Celo RPCs) timeout on `fromBlock: 0n` —
        // scanning ~30M blocks of mainnet history is too expensive for
        // a single eth_getLogs call, and the three calls below would
        // all fail simultaneously, leaving the landing-page feed empty.
        // Bound the window to the last ~200k blocks (~11 days at Celo's
        // ~5s block time), which comfortably covers seeded submissions
        // and recent organic activity. `useWatchContractEvent` below
        // continues to pick up anything newer in real time.
        const latestBlock = await publicClient.getBlockNumber();
        const LOOKBACK = 200_000n;
        const fromBlock =
          latestBlock > LOOKBACK ? latestBlock - LOOKBACK : 0n;
        const [submittedLogs, verifiedLogs, finalizedLogs] = await Promise.all([
          publicClient.getContractEvents({
            address: oracleAddress,
            abi: priceOracleAbi,
            eventName: "PriceSubmitted",
            args: options.barcode ? { barcode: options.barcode } : undefined,
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getContractEvents({
            address: oracleAddress,
            abi: priceOracleAbi,
            eventName: "Verified",
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getContractEvents({
            address: oracleAddress,
            abi: priceOracleAbi,
            eventName: "SubmissionFinalized",
            fromBlock,
            toBlock: "latest",
          }),
        ]);
        if (cancelled) return;

        const map = new Map<string, SubmissionRecord>();
        for (const log of submittedLogs as PriceSubmittedLog[]) {
          const rec = recordFromSubmitted(log);
          if (rec) map.set(rec.submissionId.toString(), rec);
        }
        for (const log of verifiedLogs as VerifiedLog[]) {
          applyVerified(map, log);
        }
        for (const log of finalizedLogs as FinalizedLog[]) {
          applyFinalized(map, log);
        }
        setRecords(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [publicClient, oracleAddress, options.barcode]);

  useWatchContractEvent({
    address: oracleAddress,
    abi: priceOracleAbi,
    eventName: "PriceSubmitted",
    args: options.barcode ? { barcode: options.barcode } : undefined,
    enabled: !!oracleAddress,
    onLogs(logs) {
      setRecords((prev) => {
        const next = new Map(prev);
        for (const log of logs as PriceSubmittedLog[]) {
          const rec = recordFromSubmitted(log);
          if (rec) next.set(rec.submissionId.toString(), rec);
        }
        return next;
      });
    },
  });

  useWatchContractEvent({
    address: oracleAddress,
    abi: priceOracleAbi,
    eventName: "Verified",
    enabled: !!oracleAddress,
    onLogs(logs) {
      setRecords((prev) => {
        const next = new Map(prev);
        for (const log of logs as VerifiedLog[]) applyVerified(next, log);
        return next;
      });
    },
  });

  useWatchContractEvent({
    address: oracleAddress,
    abi: priceOracleAbi,
    eventName: "SubmissionFinalized",
    enabled: !!oracleAddress,
    onLogs(logs) {
      setRecords((prev) => {
        const next = new Map(prev);
        for (const log of logs as FinalizedLog[]) applyFinalized(next, log);
        return next;
      });
    },
  });

  const sorted = useMemo(
    () => [...records.values()].sort((a, b) => Number(b.timestamp - a.timestamp)),
    [records],
  );

  return { records: sorted, loading };
}

type PriceSubmittedLog = Log & {
  args?: {
    submissionId?: bigint;
    barcode?: Hex;
    zoneKey?: Hex;
    submitter?: `0x${string}`;
    priceCents?: bigint;
    receiptHash?: Hex;
    timestamp?: bigint;
  };
};

type VerifiedLog = Log & {
  args?: {
    submissionId?: bigint;
    verifier?: `0x${string}`;
    isValid?: boolean;
  };
};

type FinalizedLog = Log & {
  args?: {
    submissionId?: bigint;
    accepted?: boolean;
  };
};

function recordFromSubmitted(log: PriceSubmittedLog): SubmissionRecord | null {
  if (log.args?.submissionId === undefined) return null;
  return {
    submissionId: log.args.submissionId,
    barcode: log.args.barcode as Hex,
    zoneKey: log.args.zoneKey as Hex,
    submitter: log.args.submitter as `0x${string}`,
    priceCents: log.args.priceCents ?? 0n,
    receiptHash: log.args.receiptHash as Hex,
    timestamp: log.args.timestamp ?? 0n,
    finalized: false,
    accepted: false,
    acceptVotes: 0,
    rejectVotes: 0,
    totalVotes: 0,
  };
}

function applyVerified(
  map: Map<string, SubmissionRecord>,
  log: VerifiedLog,
): void {
  const id = log.args?.submissionId;
  if (id === undefined) return;
  const rec = map.get(id.toString());
  if (!rec) return;
  rec.totalVotes += 1;
  if (log.args?.isValid) rec.acceptVotes += 1;
  else rec.rejectVotes += 1;
}

function applyFinalized(
  map: Map<string, SubmissionRecord>,
  log: FinalizedLog,
): void {
  const id = log.args?.submissionId;
  if (id === undefined) return;
  const rec = map.get(id.toString());
  if (!rec) return;
  rec.finalized = true;
  rec.accepted = Boolean(log.args?.accepted);
}
