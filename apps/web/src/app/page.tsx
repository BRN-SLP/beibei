import Link from "next/link";
import { Camera, Wallet } from "lucide-react";

import { HeroStats } from "@/components/hero/HeroStats";
import { RevealOnScroll } from "@/components/hero/RevealOnScroll";
import { MercatoLogo } from "@/components/brand/MercatoLogo";
import { Button } from "@/components/ui/button";
import { CountryBasketPreview } from "@/components/landing/CountryBasketPreview";
import { RecentSubmissions } from "@/components/feed/RecentSubmissions";
import { UserBalance } from "@/components/user-balance";

export default function Home() {
  return (
    <main className="flex-1">
      {/* HERO — split dashboard layout */}
      <section className="relative overflow-hidden border-b">
        {/* Subtle grid backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Cyan glow */}
        <div
          aria-hidden="true"
          className="absolute -top-32 right-[-10%] -z-10 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl"
        />

        <div className="container mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-20">
          {/* Left — copy + live stats */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>live · celo mainnet</span>
            </div>

            {/* The hero answers Pillar 1 of the premium-web-design
                checklist above the fold: WHAT (cost-of-living index),
                FOR WHOM (anyone, anywhere), WHY TRUST (on-chain,
                peer-verified, open data). Each phrase pulls one of the
                three. */}
            <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              The price of
              <br />
              <span className="italic text-primary">everyday life,</span>
              <br />
              measured by everyone.
            </h1>

            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              Mercato is a community-built cost-of-living index. Anyone, in any
              country, submits a local price for bread, rent, transport,
              utilities. Peers verify on-chain. Everyone involved earns cUSD.
            </p>

            {/* Stats */}
            <HeroStats />

            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="shadow-[0_0_24px_-4px_hsl(var(--primary)/0.35)]"
              >
                <Link href="/scan">
                  <Camera className="mr-2 h-4 w-4" />
                  Add a price
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/rewards">
                  <Wallet className="mr-2 h-4 w-4" />
                  My rewards
                </Link>
              </Button>
            </div>

            <UserBalance />
          </div>

          {/* Right — Mercato basket mark.
              Replaced the BeiBei AnimatedBarcode (canvas-rendered
              scanner stripes) with the brand basket SVG. The mark is
              the same one used in the favicon and OG image, scaled
              up — keeping a single brand signal across the page. */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute h-64 w-64 rounded-full bg-primary/15 blur-3xl"
            />
            <MercatoLogo
              variant="icon"
              className="relative h-56 w-56 text-primary md:h-64 md:w-64"
              ariaLabel="Mercato — community-built consumer basket"
            />
            <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              33 goods · 15 countries · 1 contract
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — editorial three-step.
          Refactored away from "identical card grid" (premium-web-design
          Pillar 2 + impeccable absolute ban). The visual anchor is now
          an oversized serif numeral per step (01 / 02 / 03), the layout
          alternates left/right so each step has its own rhythm, and the
          old icon-from-library noise is gone — the brand serif IS the
          decorative element. Mobile collapses to a single column with
          the numeral above the copy. */}
      <section className="container mx-auto max-w-5xl px-4 py-24">
        <RevealOnScroll>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mb-16 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Three picks. <span className="italic text-primary">One transaction.</span>
          </h2>
        </RevealOnScroll>

        <ol className="space-y-16 md:space-y-20">
          <RevealOnScroll>
            <li className="grid items-baseline gap-x-10 gap-y-4 md:grid-cols-[auto_1fr]">
              <span
                aria-hidden="true"
                className="font-serif text-[5.5rem] font-bold leading-none text-primary/15 md:text-[7.5rem]"
              >
                01
              </span>
              <div className="space-y-3 md:pt-4">
                <h3 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  Pick the product, type the price.
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  Choose a product from the basket, pick your country, type the
                  price you actually paid. Receipt photo is optional. One
                  on-chain transaction; the network fee is paid in cUSD if your
                  wallet supports it.
                </p>
              </div>
            </li>
          </RevealOnScroll>

          <RevealOnScroll delay={0.06}>
            <li className="grid items-baseline gap-x-10 gap-y-4 md:grid-cols-[1fr_auto] md:text-right">
              <div className="space-y-3 md:order-1 md:pt-4">
                <h3 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  Three peers tap <span className="italic text-primary">yes.</span>
                </h3>
                <p className="ml-auto max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  Other contributors in the same country vote ✓ or ✗ on pending
                  submissions. Three matching positives finalize the price and
                  unlock rewards for everyone involved in the round.
                </p>
              </div>
              <span
                aria-hidden="true"
                className="font-serif text-[5.5rem] font-bold leading-none text-primary/15 md:order-2 md:text-[7.5rem]"
              >
                02
              </span>
            </li>
          </RevealOnScroll>

          <RevealOnScroll delay={0.12}>
            <li className="grid items-baseline gap-x-10 gap-y-4 md:grid-cols-[auto_1fr]">
              <span
                aria-hidden="true"
                className="font-serif text-[5.5rem] font-bold leading-none text-primary/15 md:text-[7.5rem]"
              >
                03
              </span>
              <div className="space-y-3 md:pt-4">
                <h3 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  Sweep your rewards in cUSD.
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  Micro-rewards accumulate for every accepted submission and
                  every verification you cast on someone else&apos;s. Sweep
                  the balance to MiniPay or any Celo wallet in one claim —
                  any time, no minimum.
                </p>
              </div>
            </li>
          </RevealOnScroll>
        </ol>
      </section>

      {/* COUNTRY BASKET PREVIEW — top countries by coverage.
          Server component, pulls cached on-chain snapshot. Falls
          back to a "be the first" empty state at zero submissions. */}
      <CountryBasketPreview />

      {/* RECENT SUBMISSIONS — live feed */}
      <section className="border-t bg-secondary/40">
        <div className="container mx-auto max-w-5xl px-4 py-20">
          <RevealOnScroll>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  Live feed
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  Recent submissions
                </h2>
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.08}>
            <RecentSubmissions />
          </RevealOnScroll>
        </div>
      </section>
    </main>
  );
}
