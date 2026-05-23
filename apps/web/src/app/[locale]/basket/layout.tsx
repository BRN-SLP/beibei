import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cost-of-living index",
  description:
    "Daily, verifiable, country-by-country basket of consumer prices: open data submitted by the Mercato community and verified on-chain.",
  openGraph: {
    title: "Cost-of-living index · Mercato",
    description:
      "Daily, verifiable, country-by-country basket of consumer prices: open data submitted by the community.",
    images: ["/og.png"],
  },
};

export default function BasketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
