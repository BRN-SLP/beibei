import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';
import { WalletProvider } from "@/components/wallet-provider"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '800'],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mercato-rho.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Mercato — crowdsourced consumer price basket on Celo',
    template: '%s · Mercato',
  },
  description:
    'A community-built cost-of-living index. Anyone, anywhere, submits a local price for bread, rent, transport, utilities. Peers verify on-chain and earn cUSD micro-rewards. The open alternative to Numbeo.',
  applicationName: 'Mercato',
  keywords: [
    'Celo',
    'cUSD',
    'Mento',
    'MiniPay',
    'price oracle',
    'cost of living',
    'consumer prices',
    'inflation',
    'crowdsourced',
    'public good',
    'stablecoins',
    'emerging markets',
  ],
  authors: [{ name: 'Mercato' }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Mercato',
    url: SITE_URL,
    title: 'Mercato — crowdsourced consumer price basket on Celo',
    description:
      'A daily, verifiable, country-by-country cost-of-living index. Submit a price, earn cUSD, build a public good.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Mercato — crowdsourced cost-of-living index on Celo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercato — crowdsourced consumer price basket on Celo',
    description:
      'A daily, verifiable, country-by-country cost-of-living index — open data, on-chain, paid in cUSD.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  // Talent App domain ownership verification (Proof of Ship S2 submission).
  // Talent App fetches the homepage and looks for this meta tag once,
  // then keeps the project linked to the domain.
  other: {
    'talentapp:project_verification':
      '09dd343b9d1ceeb99d9ad2fca60abac3896430959307381db454a8b3d45414b24778622dbb293db3c0ada86f4650e0cf079694481aa762454362417927142bdd',
  },
};

/**
 * Viewport metadata. Split from the `metadata` export because Next.js
 * 14 moved theme-color / color-scheme / viewport-width into a dedicated
 * `Viewport` type — the older nested form on `metadata` is deprecated.
 *
 * Why two themeColor entries:
 *   The mobile browser chrome (Safari/Chrome address bar, Android task
 *   switcher) reads this tag to tint its UI. A single static value
 *   leaves users in the "wrong" theme with a chrome that clashes with
 *   the rest of the screen. Two media-query entries let the browser
 *   pick the right one automatically when the system or user toggle
 *   flips the preference.
 *
 *   Light → cream surface (#e7e5dd) so the iOS Safari bar blends into
 *   the page top.
 *   Dark → deep green surface (#0d2419, the same hsl(155 38% 8%) used
 *   in globals.css) so the address bar matches the page.
 *
 * `colorScheme: 'light dark'` tells the UA both modes are supported.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e7e5dd' },
    { media: '(prefers-color-scheme: dark)', color: '#0d2419' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        {/* Navbar is included on all pages */}
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <WalletProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <Toaster />
            </WalletProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
