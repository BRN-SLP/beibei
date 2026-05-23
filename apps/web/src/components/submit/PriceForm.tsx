"use client";

import { Camera, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Hex } from "viem";

import { Button } from "@/components/ui/button";
import { useSubmitPrice } from "@/hooks/useSubmitPrice";
import {
  COUNTRIES,
  detectCountryFromLocale,
  getCountriesByRegion,
  getCountryByCode,
  type Country,
} from "@/lib/countries";
import {
  ZERO_RECEIPT_HASH,
  countryToZoneKey,
  majorUnitsToCents,
  productSlugToBarcode,
} from "@/lib/encode";
import {
  PRODUCTS,
  getProductsByCategory,
  getProductBySlug,
} from "@/lib/products";
import {
  MAX_RECEIPT_BYTES,
  SUPPORTED_RECEIPT_TYPES,
  type SubmitReceiptResponse,
} from "@/lib/submissions";

interface PriceFormProps {
  /** Optional callback when the user clicks the X / "Cancel" button. */
  onCancel: () => void;
}

const DEFAULT_PRODUCT_SLUG = PRODUCTS[0].slug;
/**
 * Server-safe initial country. The actual default is detected from
 * the browser locale in a client-only effect (see useEffect below)
 * so the component renders deterministically on the server before
 * hydration. US is the safest fallback when no locale region matches
 * our launch country list.
 */
const INITIAL_COUNTRY: Country = getCountryByCode("US") ?? COUNTRIES[0];

/**
 * Submit form for Mercato's canonical basket.
 *
 * An explicit two-dropdown pick: which product, which country. The
 * underlying contract call serialises the product slug to bytes12 via
 * keccak256 and the country code to bytes6 via padded ASCII, see
 * lib/encode.ts for the exact wire format.
 */
export function PriceForm({ onCancel }: PriceFormProps) {
  const t = useTranslations("scan");
  const submit = useSubmitPrice();

  const [productSlug, setProductSlug] = useState<string>(DEFAULT_PRODUCT_SLUG);
  const [country, setCountry] = useState<Country>(INITIAL_COUNTRY);
  const [priceWhole, setPriceWhole] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect user's country from browser locale, post-hydration. Falls
  // back to INITIAL_COUNTRY silently if locale has no region or the
  // region isn't in our launch list. Running this on the server would
  // produce a different value than the first client render and trip
  // React's hydration check, hence the useEffect gate.
  useEffect(() => {
    const detected = detectCountryFromLocale();
    if (detected && detected.code !== INITIAL_COUNTRY.code) {
      setCountry(detected);
    }
  }, []);

  const product = useMemo(
    () => getProductBySlug(productSlug) ?? PRODUCTS[0],
    [productSlug],
  );

  const totalCents = computeTotalCents(priceWhole, priceCents);

  const busy =
    uploading ||
    submit.state.kind === "awaiting_signature" ||
    submit.state.kind === "confirming";

  const ready = totalCents > 0 && !busy;

  async function handleFile(file: File | null): Promise<void> {
    setError(null);
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!SUPPORTED_RECEIPT_TYPES.includes(file.type as never)) {
      setError(t("errors.unsupportedFile", { type: file.type }));
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError(
        t("errors.fileTooLarge", {
          size: file.size,
          max: MAX_RECEIPT_BYTES,
        }),
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
        throw new Error(
          errBody.error ?? t("errors.uploadFailed", { status: res.status }),
        );
      }
      const json = (await res.json()) as SubmitReceiptResponse;
      return json.receiptHash as Hex;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    try {
      const barcode = productSlugToBarcode(productSlug);
      const zoneKey = countryToZoneKey(country.code);
      const receiptHash = await uploadReceipt();
      await submit.submit({
        barcode,
        zoneKey,
        priceCents: totalCents,
        receiptHash,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    }
  }

  if (submit.state.kind === "success") {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-semibold text-primary">
          {t("success.title", { id: submit.state.submissionId.toString() })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("success.body")}
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={onCancel} size="sm">
            {t("success.again")}
          </Button>
        </div>
      </div>
    );
  }

  const productGroups = getProductsByCategory();
  const countryGroups = getCountriesByRegion();

  return (
    <div className="space-y-5 rounded-md border border-input bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold">
            {t("form.title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("form.subtitle")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          aria-label={t("form.cancel")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Product */}
      <div className="space-y-1.5">
        <label htmlFor="mercato-product" className="text-sm font-medium">
          {t("form.product.label")}
        </label>
        <select
          id="mercato-product"
          value={productSlug}
          onChange={(e) => setProductSlug(e.target.value)}
          aria-label={t("form.product.aria")}
          className="block w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {productGroups.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {group.products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                  {p.hint ? ` — ${p.hint}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <label htmlFor="mercato-country" className="text-sm font-medium">
          {t("form.country.label")}
        </label>
        <select
          id="mercato-country"
          value={country.code}
          onChange={(e) => {
            const next = getCountryByCode(e.target.value);
            if (next) setCountry(next);
          }}
          aria-label={t("form.country.aria")}
          className="block w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {countryGroups.map((group) => (
            <optgroup key={group.region} label={group.label}>
              {group.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name} · {c.currency}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {t("form.country.currencyHint", { currency: country.currency })}
        </p>
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <label htmlFor="mercato-price-whole" className="text-sm font-medium">
          {t("form.price.label")}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="mercato-price-whole"
            value={priceWhole}
            onChange={(e) => setPriceWhole(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            inputMode="numeric"
            aria-label={t("form.price.wholeAria")}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-right font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span aria-hidden="true" className="text-muted-foreground">
            .
          </span>
          <input
            value={priceCents}
            onChange={(e) =>
              setPriceCents(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            placeholder="00"
            inputMode="numeric"
            aria-label={t("form.price.centsAria")}
            className="w-14 shrink-0 rounded-md border border-input bg-background px-3 py-2.5 font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="w-12 shrink-0 text-right font-mono text-sm text-muted-foreground">
            {country.currency}
          </span>
        </div>
      </div>

      {/* Receipt (optional) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("form.receipt.label")}</label>
        <input
          type="file"
          accept={SUPPORTED_RECEIPT_TYPES.join(",")}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm hover:file:bg-muted/80"
        />
        {receiptFile && (
          <p className="text-xs text-muted-foreground">
            <Upload className="mr-1 inline h-3 w-3" />
            {t("form.receipt.fileSize", {
              name: receiptFile.name,
              kb: Math.round(receiptFile.size / 1024),
            })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SubmitStatus
          uploading={uploading}
          submitState={submit.state}
          error={error}
        />
        <Button
          onClick={handleSubmit}
          disabled={!ready}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
          {busy
            ? t("form.submit.busy")
            : t("form.submit.idle", { product: product.label.toLowerCase() })}
        </Button>
      </div>
    </div>
  );
}

function computeTotalCents(whole: string, cents: string): number {
  try {
    const wholePart = whole || "0";
    const fracPart = (cents || "0").padEnd(2, "0").slice(0, 2);
    return majorUnitsToCents(`${wholePart}.${fracPart}`);
  } catch {
    return 0;
  }
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
  const t = useTranslations("scan.status");
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (uploading)
    return (
      <span className="text-xs text-muted-foreground">{t("uploading")}</span>
    );
  switch (submitState.kind) {
    case "awaiting_signature":
      return (
        <span className="text-xs text-muted-foreground">
          {t("awaitingSignature")}
        </span>
      );
    case "confirming":
      return (
        <span className="text-xs text-muted-foreground">{t("confirming")}</span>
      );
    case "error":
      return (
        <span className="text-xs text-destructive">{submitState.message}</span>
      );
    default:
      return null;
  }
}
