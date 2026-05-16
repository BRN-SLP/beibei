import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://beibei-rho.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BeiBei — crowdsourced product prices on Celo',
    template: '%s · BeiBei',
  },
  description:
    'Scan a barcode. Type the price. Verify nearby submissions. Three matching votes finalize a median price and unlock cUSD micro-rewards for everyone involved.',
  applicationName: 'BeiBei',
  keywords: [
    'Celo',
    'cUSD',
    'MiniPay',
    'price oracle',
    'barcode',
    'crowdsourced',
    'micro-rewards',
  ],
  authors: [{ name: 'BeiBei' }],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
  manifest: '/site.webmanifest',
  themeColor: '#0b1220',
  openGraph: {
    type: 'website',
    siteName: 'BeiBei',
    url: SITE_URL,
    title: 'BeiBei — crowdsourced product prices on Celo',
    description:
      'Scan, verify, earn. The on-chain price index for everyday goods.',
    images: [
      {
        url: '/og.svg',
        width: 1200,
        height: 630,
        alt: 'BeiBei — crowdsourced price tracker on Celo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeiBei — crowdsourced product prices on Celo',
    description: 'Scan a barcode → submit a price → earn cUSD. Built on Celo.',
    images: ['/og.svg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
