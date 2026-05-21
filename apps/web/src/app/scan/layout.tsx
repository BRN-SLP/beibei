import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan a price",
  description:
    "Point your camera at any UPC/EAN-13 barcode, enter the price you paid, optionally attach a receipt photo. Submission goes on-chain in one transaction.",
  openGraph: {
    title: "Submit a price · Mercato",
    description:
      "Pick a product, pick your country, enter the price you paid. Verified peers earn cUSD. Open cost-of-living index, on-chain.",
    images: ["/og.png"],
  },
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
