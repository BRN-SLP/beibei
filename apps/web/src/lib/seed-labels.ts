import { barcodeStringToHex } from "./submissions";

/**
 * Curated launch-day seed products — the same set the deployer publishes
 * via `apps/contracts/scripts/seed-submissions.ts`. Kept in lockstep with
 * `apps/contracts/seed/products.ts`; if you add a product there, mirror
 * the metadata here so the UI shows a human label and country flag.
 *
 * Keyed by the 12-byte hex barcode (matches `submitPrice` bytes12 arg).
 */
export interface SeedProductLabel {
  label: string;
  country: "KE" | "NG" | "GH" | "ZA";
  flag: string; // emoji
  currency: "KES" | "NGN" | "GHS" | "ZAR";
  city: string;
}

const RAW: Record<
  string,
  Omit<SeedProductLabel, "flag">
> = {
  "6160100040036": {
    label: "Pembe Maize Flour 2 kg",
    country: "KE",
    currency: "KES",
    city: "Nairobi (Westlands)",
  },
  "6161100100015": {
    label: "Mumias Sugar 1 kg",
    country: "KE",
    currency: "KES",
    city: "Mombasa",
  },
  "6161109210041": {
    label: "Elianto Cooking Oil 1 L",
    country: "KE",
    currency: "KES",
    city: "Kisumu",
  },
  "6161101170040": {
    label: "Superloaf Bread 400 g",
    country: "KE",
    currency: "KES",
    city: "Nairobi (CBD)",
  },
  "6161105050005": {
    label: "KCC Fresh Milk 500 ml",
    country: "NG",
    currency: "NGN",
    city: "Lagos (Ikeja)",
  },
  "6154000004012": {
    label: "Caprice Rice 1 kg",
    country: "NG",
    currency: "NGN",
    city: "Lagos (Surulere)",
  },
  "6009675890024": {
    label: "Premier Soap Bar 800 g",
    country: "GH",
    currency: "GHS",
    city: "Accra",
  },
  "6001056000023": {
    label: "Lipton Yellow Label 50 ct",
    country: "ZA",
    currency: "ZAR",
    city: "Cape Town (CBD)",
  },
};

const FLAGS: Record<SeedProductLabel["country"], string> = {
  KE: "🇰🇪",
  NG: "🇳🇬",
  GH: "🇬🇭",
  ZA: "🇿🇦",
};

/** Lookup table keyed by canonical hex barcode (bytes12 from on-chain). */
export const SEED_LABELS: Record<string, SeedProductLabel> = Object.fromEntries(
  Object.entries(RAW).map(([digits, meta]) => {
    const hex = barcodeStringToHex(digits).toLowerCase();
    return [hex, { ...meta, flag: FLAGS[meta.country] }];
  }),
);

export function findSeedLabel(barcodeHex: string): SeedProductLabel | null {
  return SEED_LABELS[barcodeHex.toLowerCase()] ?? null;
}
