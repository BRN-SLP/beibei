import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rewards",
  description:
    "Track your pending cUSD rewards from accepted submissions and verifications. Claim accumulated balance to your wallet in one transaction.",
  openGraph: {
    title: "Rewards · BeiBei",
    description:
      "Submitter and verifier micro-rewards in cUSD — claim anytime.",
    images: ["/og.svg"],
  },
  robots: { index: false, follow: false },
};

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
