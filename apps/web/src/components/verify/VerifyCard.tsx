"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerify } from "@/hooks/useVerify";
import type { SubmissionRecord } from "@/hooks/usePriceFeed";
import { zoneKeyToGps } from "@/lib/zone";

interface VerifyCardProps {
  submission: SubmissionRecord;
}

export function VerifyCard({ submission }: VerifyCardProps) {
  const verify = useVerify();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);

  async function handle(isValid: boolean) {
    setPending(isValid ? "accept" : "reject");
    try {
      await verify.verify(submission.submissionId, isValid);
    } finally {
      setPending(null);
    }
  }

  const zone = (() => {
    try {
      return zoneKeyToGps(submission.zoneKey);
    } catch {
      return null;
    }
  })();

  const busy =
    verify.state.kind === "submitting" || verify.state.kind === "confirming";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Submission #{submission.submissionId.toString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-semibold tracking-tight">
            {(Number(submission.priceCents) / 100).toFixed(2)}
          </span>
          {zone && (
            <span className="text-xs text-muted-foreground">
              zone {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            votes {submission.acceptVotes}-{submission.rejectVotes} of 3
          </span>
        </div>
        <div className="flex gap-2" role="group" aria-label={`Verify submission #${submission.submissionId.toString()}`}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handle(true)}
            disabled={busy}
            aria-label={`Accept submission #${submission.submissionId.toString()}`}
            aria-busy={pending === "accept" || undefined}
            className="flex-1"
          >
            {pending === "accept" ? (
              <Loader2
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Check
                aria-hidden="true"
                className="mr-2 h-4 w-4 text-emerald-600"
              />
            )}
            Looks right
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handle(false)}
            disabled={busy}
            aria-label={`Reject submission #${submission.submissionId.toString()}`}
            aria-busy={pending === "reject" || undefined}
            className="flex-1"
          >
            {pending === "reject" ? (
              <Loader2
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <X
                aria-hidden="true"
                className="mr-2 h-4 w-4 text-rose-600"
              />
            )}
            Off
          </Button>
        </div>
        {verify.state.kind === "error" && (
          <p className="text-xs text-destructive">{verify.state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
