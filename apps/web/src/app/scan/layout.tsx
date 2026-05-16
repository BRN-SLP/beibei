import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan a price",
  description:
    "Point your camera at any UPC/EAN-13 barcode, enter the price you paid, optionally attach a receipt photo. Submission goes on-chain in one transaction.",
  openGraph: {
    title: "Scan a price · BeiBei",
    description:
      "Crowdsourced price submission from your phone — camera + GPS-derived zone + on-chain receipt hash.",
    images: ["/og.svg"],
  },
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
