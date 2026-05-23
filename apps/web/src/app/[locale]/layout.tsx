import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';
import { WalletProvider } from '@/components/wallet-provider';
import { routing, type Locale } from '@/i18n/routing';

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
    default: 'Mercato · crowdsourced consumer price basket on Celo',
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
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Mercato',
    url: SITE_URL,
    title: 'Mercato · crowdsourced consumer price basket on Celo',
    description:
      'A daily, verifiable, country-by-country cost-of-living index. Submit a price, earn cUSD, build a public good.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Mercato · crowdsourced cost-of-living index on Celo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercato · crowdsourced consumer price basket on Celo',
    description:
      'A daily, verifiable, country-by-country cost-of-living index: open data, on-chain, paid in cUSD.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

/**
 * Viewport metadata. Two themeColor entries so the mobile browser
 * chrome tints to match the active theme: cream for light, deep
 * green for dark.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eee5dd' },
    { media: '(prefers-color-scheme: dark)', color: '#0c3c2f' },
  ],
  colorScheme: 'light dark',
};

/**
 * Pre-render static locale variants at build time so Next.js can
 * generate static HTML for every supported language instead of
 * resolving the locale on each request.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Required when using static rendering — tells next-intl which
  // locale to use for this request.
  setRequestLocale(locale as Locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <NextIntlClientProvider>
          <ThemeProvider>
            <div className="relative flex min-h-screen flex-col">
              <WalletProvider>
                <Navbar />
                {/* No <main> here — each page provides its own so
                    the document has exactly one main landmark.
                    Layout-level <main> would duplicate the
                    page-level <main> on /, /basket, /scan, /rewards
                    and trip WCAG 2.4.1 + AXE rules. */}
                <div className="flex-1">{children}</div>
                <Footer />
                <Toaster />
              </WalletProvider>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
