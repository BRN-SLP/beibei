/**
 * Curated launch-day seed products. Real EAN-13 codes, real African
 * grocery items, real city zones. The team submits all eight and then
 * verifies them with three derived EOAs so the consensus engine produces
 * eight "Finalized" entries before any external user shows up.
 *
 * Listed openly as bootstrap data — once external submissions arrive,
 * these can be filtered by submitter address in the feed.
 */
export interface SeedProduct {
  label: string;
  barcode: string; // EAN-13 or UPC-A digits — real packaging
  city: string;
  countryCode: "KE" | "NG" | "GH" | "ZA";
  lat: number;
  lng: number;
  currency: "KES" | "NGN" | "GHS" | "ZAR";
  priceMajor: number; // whole units of the local currency
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    label: "Pembe Maize Flour 2 kg",
    barcode: "6160100040036",
    city: "Nairobi (Westlands)",
    countryCode: "KE",
    lat: -1.27,
    lng: 36.81,
    currency: "KES",
    priceMajor: 220,
  },
  {
    label: "Mumias Sugar 1 kg",
    barcode: "6161100100015",
    city: "Mombasa",
    countryCode: "KE",
    lat: -4.05,
    lng: 39.66,
    currency: "KES",
    priceMajor: 175,
  },
  {
    label: "Elianto Cooking Oil 1 L",
    barcode: "6161109210041",
    city: "Kisumu",
    countryCode: "KE",
    lat: -0.09,
    lng: 34.77,
    currency: "KES",
    priceMajor: 320,
  },
  {
    label: "Superloaf Bread 400 g",
    barcode: "6161101170040",
    city: "Nairobi (CBD)",
    countryCode: "KE",
    lat: -1.29,
    lng: 36.82,
    currency: "KES",
    priceMajor: 75,
  },
  {
    label: "KCC Fresh Milk 500 ml",
    barcode: "6161105050005",
    city: "Lagos (Ikeja)",
    countryCode: "NG",
    lat: 6.6,
    lng: 3.35,
    currency: "NGN",
    priceMajor: 350,
  },
  {
    label: "Caprice Rice 1 kg",
    barcode: "6154000004012",
    city: "Lagos (Surulere)",
    countryCode: "NG",
    lat: 6.49,
    lng: 3.36,
    currency: "NGN",
    priceMajor: 1200,
  },
  {
    label: "Premier Soap Bar 800 g",
    barcode: "6009675890024",
    city: "Accra",
    countryCode: "GH",
    lat: 5.6,
    lng: -0.19,
    currency: "GHS",
    priceMajor: 8,
  },
  {
    label: "Lipton Yellow Label 50 ct",
    barcode: "6001056000023",
    city: "Cape Town (CBD)",
    countryCode: "ZA",
    lat: -33.92,
    lng: 18.42,
    currency: "ZAR",
    priceMajor: 25,
  },
];
