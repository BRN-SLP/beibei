"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useChainId } from "wagmi";
import type { Hex } from "viem";
import { use } from "react";

import { MedianChart } from "@/components/chart/MedianChart";
import { VerifyCard } from "@/components/verify/VerifyCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { weightedMedian } from "@/lib/median";
import { bytes12HexRegex } from "@/lib/submissions";

interface ItemPageProps {
  params: Promise<{ barcode: string }>;
}

export default function ItemPage({ params }: ItemPageProps) {
  const { barcode } = use(params);
  const chainId = useChainId();
  const t = useTranslations("item");
  const hexBarcode = normalizeBarcode(barcode);

  // Malformed barcode → render the item-specific 404 instead of an
  // inline destructive paragraph. The not-found page already explains
  // the expected format and CTAs the user to /scan.
  if (!hexBarcode) notFound();

  const { records, loading } = usePriceFeed(chainId, {
    barcode: hexBarcode,
  });

  const accepted = records.filter((r) => r.finalized && r.accepted);
  const pending = records.filter((r) => !r.finalized && r.totalVotes < 3);
  const median =
    accepted.length > 0
      ? weightedMedian(
          accepted.map((s) => ({
            priceCents: Number(s.priceCents),
            timestampSeconds: Number(s.timestamp),
          })),
        )
      : null;

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <p className="text-xs text-muted-foreground font-mono">{hexBarcode}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t("feedTitle")}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("median.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">
            {median !== null ? (median / 100).toFixed(2) : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("median.subtitle", { count: accepted.length })}
          </p>
          <div className="mt-4">
            <MedianChart submissions={records} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("verify.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {t("verify.loading")}
            </p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("verify.empty")}
            </p>
          ) : (
            pending
              .slice(0, 3)
              .map((rec) => (
                <VerifyCard
                  key={rec.submissionId.toString()}
                  submission={rec}
                />
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("recent.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("recent.empty")}
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {records.slice(0, 10).map((r) => (
                <li
                  key={r.submissionId.toString()}
                  className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-mono text-xs">
                    #{r.submissionId.toString()} •{" "}
                    {(Number(r.priceCents) / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.finalized
                      ? r.accepted
                        ? t("recent.status.accepted")
                        : t("recent.status.rejected")
                      : r.totalVotes >= 3
                        ? t("recent.status.locked")
                        : t("recent.status.pending", { votes: r.totalVotes })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function normalizeBarcode(raw: string): Hex | null {
  if (bytes12HexRegex.test(raw)) return raw as Hex;
  return null;
}
