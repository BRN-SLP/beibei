"use client";

import { useChainId } from "wagmi";

import { StatTicker } from "@/components/hero/StatTicker";
import { usePriceFeed } from "@/hooks/usePriceFeed";

/**
 * Live stats grid for the BeiBei hero. Reads on-chain events via
 * usePriceFeed and renders three count-up tickers:
 *   - Total submissions
 *   - Accepted submissions (finalized=true, accepted=true)
 *   - Pending (waiting for verification)
 */
export function HeroStats() {
  const chainId = useChainId();
  const { records } = usePriceFeed(chainId);

  const total = records.length;
  const accepted = records.filter((r) => r.finalized && r.accepted).length;
  const pending = records.filter((r) => !r.finalized).length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatTicker value={total} label="submissions" />
      <StatTicker value={accepted} label="accepted" />
      <StatTicker value={pending} label="pending" />
    </div>
  );
}
