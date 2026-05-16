"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import type { Hex } from "viem";

import { getPriceOracleAddress, priceOracleAbi } from "@/lib/contracts";

type SubmitState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "awaiting_signature" }
  | { kind: "confirming"; txHash: Hex }
  | { kind: "success"; submissionId: bigint }
  | { kind: "error"; message: string };

interface SubmitArgs {
  barcode: Hex;
  zoneKey: Hex;
  priceCents: bigint;
  receiptHash: Hex;
}

export function useSubmitPrice() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const submit = useCallback(
    async ({ barcode, zoneKey, priceCents, receiptHash }: SubmitArgs) => {
      if (!address) {
        setState({ kind: "error", message: "wallet not connected" });
        return;
      }
      if (!publicClient) {
        setState({ kind: "error", message: "no public client" });
        return;
      }
      let oracleAddress: `0x${string}`;
      try {
        oracleAddress = getPriceOracleAddress(chainId);
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "unsupported chain",
        });
        return;
      }
      const toastId = toast.loading("Submitting price…");
      try {
        setState({ kind: "awaiting_signature" });
        const tx = await writeContractAsync({
          chainId,
          address: oracleAddress,
          abi: priceOracleAbi,
          functionName: "submitPrice",
          args: [barcode, zoneKey, priceCents, receiptHash],
        });
        setState({ kind: "confirming", txHash: tx });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
        });

        // Decode submissionId from the PriceSubmitted event for nicer UX.
        const submissionId =
          extractSubmissionId(receipt.logs, oracleAddress) ?? -1n;
        setState({ kind: "success", submissionId });
        toast.success("Submission live", {
          id: toastId,
          description:
            submissionId >= 0n
              ? `id #${submissionId.toString()} — awaiting 3 verifications`
              : "Awaiting 3 verifications",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message.split("\n")[0]
            : "submission failed";
        setState({ kind: "error", message });
        toast.error("Submission failed", { id: toastId, description: message });
      }
    },
    [address, chainId, publicClient, writeContractAsync],
  );

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { submit, reset, state };
}

interface LogLike {
  address: `0x${string}`;
  topics: Hex[];
  data: Hex;
}

function extractSubmissionId(
  logs: readonly LogLike[],
  oracleAddress: `0x${string}`,
): bigint | undefined {
  for (const log of logs) {
    if (log.address.toLowerCase() !== oracleAddress.toLowerCase()) continue;
    // topic0 = event signature hash of PriceSubmitted; topic1 = submissionId.
    if (log.topics.length >= 2) {
      try {
        return BigInt(log.topics[1] as string);
      } catch {
        continue;
      }
    }
  }
  return undefined;
}
