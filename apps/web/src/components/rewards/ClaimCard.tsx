"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatUnits } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPriceOracleAddress, priceOracleAbi } from "@/lib/contracts";

interface ClaimCardProps {
  pending: bigint;
  onClaimed: () => void | Promise<void>;
}

type ClaimState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "confirming"; txHash: `0x${string}` }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function ClaimCard({ pending, onClaimed }: ClaimCardProps) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<ClaimState>({ kind: "idle" });

  const hasFunds = pending > 0n;
  const busy = state.kind === "submitting" || state.kind === "confirming";

  async function handleClaim() {
    if (!isConnected || !publicClient) return;
    try {
      const oracleAddress = getPriceOracleAddress(chainId);
      setState({ kind: "submitting" });
      const tx = await writeContractAsync({
        chainId,
        address: oracleAddress,
        abi: priceOracleAbi,
        functionName: "claimRewards",
      });
      setState({ kind: "confirming", txHash: tx });
      const toastId = toast.loading("Claiming rewards…", {
        description: `${formatUnits(pending, 18)} cUSD`,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setState({ kind: "success" });
      toast.success("Rewards claimed", {
        id: toastId,
        description: "Funds are on their way to your wallet.",
      });
      await onClaimed();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message.split("\n")[0] : "claim failed";
      setState({ kind: "error", message });
      toast.error("Claim failed", { description: message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending rewards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight">
            {formatUnits(pending, 18)} <span className="text-base">cUSD</span>
          </div>
          {!hasFunds && (
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing to claim yet — scan a price or verify others&apos;
              submissions to earn.
            </p>
          )}
        </div>
        <Button
          onClick={handleClaim}
          disabled={!hasFunds || busy}
          size="lg"
          className="w-full"
        >
          {busy
            ? state.kind === "submitting"
              ? "Confirm in wallet…"
              : "Waiting for confirmation…"
            : "Claim cUSD"}
        </Button>
        {state.kind === "error" && (
          <p className="text-xs text-destructive">Error: {state.message}</p>
        )}
        {state.kind === "success" && (
          <p className="text-xs text-emerald-600">Claimed.</p>
        )}
      </CardContent>
    </Card>
  );
}
