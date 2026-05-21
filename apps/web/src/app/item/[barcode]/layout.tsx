import type { Metadata } from "next";

interface LayoutProps {
  params: Promise<{ barcode: string }>;
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { barcode } = await params;
  const short = barcode.startsWith("0x") && barcode.length > 12
    ? `${barcode.slice(0, 10)}…${barcode.slice(-6)}`
    : barcode;
  const title = `Item ${short}`;
  const description =
    "Median price, recent submissions, and pending verifications for this item across the Mercato community.";
  return {
    title,
    description,
    openGraph: {
      title: `${title} · Mercato`,
      description,
      type: "article",
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Mercato`,
      description,
      images: ["/og.png"],
    },
  };
}

export default function ItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
