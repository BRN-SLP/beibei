"use client";

import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { ClaimCard } from "@/components/rewards/ClaimCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePendingRewards } from "@/hooks/usePendingRewards";
import { useRewardConstants } from "@/hooks/useRewardConstants";
import { useRewardsActivity } from "@/hooks/useRewardsActivity";

function formatReward(wei: bigint | null): string {
  if (wei === null) return "—";
  // Trim trailing zeros so 50000000000000000 → "0.05", not "0.050000000000000000".
  const s = formatUnits(wei, 18);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export default function RewardsPage() {
  const { isConnected, address } = useAccount();
  const { pending, refetch, oracleAddress } = usePendingRewards();
  const { activity, loading } = useRewardsActivity();
  const rewards = useRewardConstants();

  if (!isConnected || !address) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Connect your wallet to see pending rewards and claim history.
        </p>
      </main>
    );
  }

  if (!oracleAddress) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
        <p className="mt-3 text-sm text-destructive">
          Mercato is not deployed on this network yet. Switch to a supported
          chain.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {address}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ClaimCard
          pending={pending}
          onClaimed={async () => {
            await refetch();
          }}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lifetime claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatUnits(activity.totalClaimed, 18)}{" "}
              <span className="text-base">cUSD</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.claims.length} claim
              {activity.claims.length === 1 ? "" : "s"} on record.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? "—" : activity.submissionCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Prices you submitted on-chain.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? "—" : activity.verificationCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Votes you cast on other submissions.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How rewards work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Each accepted submission earns{" "}
            <span className="font-medium text-foreground">
              {formatReward(rewards.submitter)} cUSD
            </span>{" "}
            once it gathers three consistent verifications. Each verification
            on an accepted submission earns{" "}
            <span className="font-medium text-foreground">
              {formatReward(rewards.verifier)} cUSD
            </span>
            .
          </p>
          <p>
            Rewards accumulate inside the contract until you claim — one
            transaction sweeps the full balance to your wallet.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Values are read directly from the deployed PriceOracle, so they
            always match the active chain.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
