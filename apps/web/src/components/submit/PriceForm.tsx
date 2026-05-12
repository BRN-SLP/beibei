"use client";

import { Camera, MapPin, Upload, X } from "lucide-react";
import { useState } from "react";
import type { Hex } from "viem";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSubmitPrice } from "@/hooks/useSubmitPrice";
import {
  MAX_RECEIPT_BYTES,
  SUPPORTED_RECEIPT_TYPES,
  barcodeStringToHex,
  type SubmitReceiptResponse,
} from "@/lib/submissions";
import { gpsToZoneKey } from "@/lib/zone";

interface PriceFormProps {
  barcode: string;
  onCancel: () => void;
}

const CURRENCIES = ["KES", "NGN", "GHS", "USD", "ZAR"] as const;
type Currency = (typeof CURRENCIES)[number];

const ZERO_RECEIPT_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export function PriceForm({ barcode, onCancel }: PriceFormProps) {
  const geo = useGeolocation();
  const submit = useSubmitPrice();

  const [priceWhole, setPriceWhole] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [currency, setCurrency] = useState<Currency>("KES");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy =
    uploading ||
    submit.state.kind === "awaiting_signature" ||
    submit.state.kind === "confirming";

  const totalCents = computeTotalCents(priceWhole, priceCents);
  const ready =
    totalCents > 0 &&
    barcode.length >= 8 &&
    (geo.status === "ok" || geo.status === "error") && // allow without GPS too
    !busy;

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!SUPPORTED_RECEIPT_TYPES.includes(file.type as never)) {
      setError(
        `Unsupported file type ${file.type}. Use JPEG / PNG / WebP.`,
      );
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError(
        `Receipt too large (${file.size} bytes, max ${MAX_RECEIPT_BYTES}).`,
      );
      return;
    }
    setReceiptFile(file);
  }

  async function uploadReceipt(): Promise<Hex> {
    if (!receiptFile) return ZERO_RECEIPT_HASH;
    setUploading(true);
    try {
      const base64 = await fileToBase64(receiptFile);
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: receiptFile.type }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errBody.error ?? `upload failed (${res.status})`);
      }
      const json = (await res.json()) as SubmitReceiptResponse;
      return json.receiptHash as Hex;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      const barcodeHex = barcodeStringToHex(barcode);
      const zoneKey: Hex =
        geo.status === "ok" && geo.lat !== undefined && geo.lng !== undefined
          ? gpsToZoneKey(geo.lat, geo.lng)
          : ("0x000000000000" as Hex);
      const receiptHash = await uploadReceipt();
      await submit.submit({
        barcode: barcodeHex,
        zoneKey,
        priceCents: BigInt(totalCents),
        receiptHash,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "unknown error");
    }
  }

  if (submit.state.kind === "success") {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-50 p-4 text-sm dark:bg-emerald-950/40">
        <p className="font-medium text-emerald-700 dark:text-emerald-300">
          Submission #{submit.state.submissionId.toString()} accepted on-chain.
        </p>
        <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/70">
          Waiting for community verification (3 votes needed). Reward will
          appear on your /rewards page once finalized.
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={onCancel} size="sm">
            Scan another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-input bg-background p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">New price submission</h2>
          <p className="font-mono text-xs text-muted-foreground">{barcode}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Price</label>
        <div className="flex items-center gap-2">
          <input
            value={priceWhole}
            onChange={(e) => setPriceWhole(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            inputMode="numeric"
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-right font-mono"
          />
          <span className="text-muted-foreground">.</span>
          <input
            value={priceCents}
            onChange={(e) =>
              setPriceCents(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            placeholder="00"
            inputMode="numeric"
            className="w-16 rounded-md border border-input bg-background px-3 py-2 font-mono"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        {geo.status === "ok" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {geo.lat?.toFixed(2)}, {geo.lng?.toFixed(2)}
          </div>
        ) : geo.status === "error" ? (
          <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/40">
            <span className="text-amber-700 dark:text-amber-300">
              {geo.error}. Submission will skip zone tagging.
            </span>
            <Button variant="ghost" size="sm" onClick={geo.refresh}>
              Retry
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Requesting location…
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Receipt photo (optional)</label>
        <input
          type="file"
          accept={SUPPORTED_RECEIPT_TYPES.join(",")}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm hover:file:bg-muted/80"
        />
        {receiptFile && (
          <p className="text-xs text-muted-foreground">
            <Upload className="mr-1 inline h-3 w-3" />
            {receiptFile.name} ({Math.round(receiptFile.size / 1024)} KB)
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SubmitStatus
          uploading={uploading}
          submitState={submit.state}
          error={error}
        />
        <Button onClick={handleSubmit} disabled={!ready} size="lg">
          <Camera className="mr-2 h-4 w-4" />
          {busy ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function computeTotalCents(whole: string, cents: string): number {
  const w = Number.parseInt(whole || "0", 10);
  const c = Number.parseInt((cents || "0").padEnd(2, "0").slice(0, 2), 10);
  if (!Number.isFinite(w) || !Number.isFinite(c)) return 0;
  return w * 100 + c;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = fr.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("failed to read file"));
    };
    fr.onerror = () => reject(fr.error ?? new Error("file read failed"));
    fr.readAsDataURL(file);
  });
}

function SubmitStatus({
  uploading,
  submitState,
  error,
}: {
  uploading: boolean;
  submitState: ReturnType<typeof useSubmitPrice>["state"];
  error: string | null;
}) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (uploading)
    return (
      <span className="text-xs text-muted-foreground">Uploading receipt…</span>
    );
  switch (submitState.kind) {
    case "awaiting_signature":
      return (
        <span className="text-xs text-muted-foreground">
          Confirm in wallet…
        </span>
      );
    case "confirming":
      return (
        <span className="text-xs text-muted-foreground">
          Waiting for confirmation…
        </span>
      );
    case "error":
      return (
        <span className="text-xs text-destructive">{submitState.message}</span>
      );
    default:
      return null;
  }
}
