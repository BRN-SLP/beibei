import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
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
 * `Viewport` type — the older nested form on `metadata` is deprecated
 * and produces a build warning.
 *
 * Why two themeColor entries:
 *   The mobile browser chrome (Safari/Chrome address bar, Android task
 *   switcher) reads this tag to tint its UI. A single static value
 *   leaves users in the "wrong" theme with a chrome that clashes with
 *   the rest of the screen. Two media-query entries let the browser
 *   pick the right one automatically when the system or user toggle
 *   flips the preference.
 *
 * `colorScheme: 'light dark'` tells the UA both modes are supported,
 * which enables built-in form widgets, scrollbars, and any
 * `color-scheme:` CSS query to react correctly.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
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
