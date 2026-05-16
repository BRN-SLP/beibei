import Link from "next/link";
import {
  BarChart3,
  Camera,
  Scan,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { AnimatedBarcode } from "@/components/hero/AnimatedBarcode";
import { HeroStats } from "@/components/hero/HeroStats";
import { RevealOnScroll } from "@/components/hero/RevealOnScroll";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecentSubmissions } from "@/components/feed/RecentSubmissions";
import { ZoneCoverage } from "@/components/landing/ZoneCoverage";
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
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span>live · celo sepolia</span>
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              The on-chain
              <br />
              <span className="text-primary">price index</span>
              <br />
              for everyday goods.
            </h1>

            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              Scan a barcode. Type the price you paid. Other shoppers in your
              zone verify. Three matching votes finalize the median — and
              everyone involved earns cUSD micro-rewards.
            </p>

            {/* Stats */}
            <HeroStats />

            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="shadow-[0_0_24px_-4px_hsl(var(--primary)/0.45)]"
              >
                <Link href="/scan">
                  <Camera className="mr-2 h-4 w-4" />
                  Scan a price
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

          {/* Right — animated barcode panel */}
          <div className="relative">
            <AnimatedBarcode />
            {/* Caption */}
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              barcode · 12-byte hex · 1.1km zone grid
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3-step rail */}
      <section className="container mx-auto max-w-5xl px-4 py-20">
        <RevealOnScroll>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mb-12 text-3xl font-semibold tracking-tight md:text-4xl">
            Three taps. One transaction.
          </h2>
        </RevealOnScroll>

        <div className="grid gap-6 md:grid-cols-3">
          <RevealOnScroll>
            <Card className="h-full border-l-4 border-l-primary/70 transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_-12px_hsl(var(--primary)/0.55)]">
              <CardHeader>
                <Scan className="h-6 w-6 text-primary" />
                <CardTitle className="mt-3 text-lg">
                  01 · Scan + submit
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Point your camera at any barcode, enter the price you paid,
                attach an optional receipt photo. Submission goes on-chain
                in one tx.
              </CardContent>
            </Card>
          </RevealOnScroll>

          <RevealOnScroll delay={0.08}>
            <Card className="h-full border-l-4 border-l-primary/70 transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_-12px_hsl(var(--primary)/0.55)]">
              <CardHeader>
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle className="mt-3 text-lg">02 · Verify nearby</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Tap ✓ or ✗ on pending submissions in your zone. Three
                matching votes finalize the price and unlock rewards for
                everyone involved.
              </CardContent>
            </Card>
          </RevealOnScroll>

          <RevealOnScroll delay={0.16}>
            <Card className="h-full border-l-4 border-l-primary/70 transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_-12px_hsl(var(--primary)/0.55)]">
              <CardHeader>
                <BarChart3 className="h-6 w-6 text-primary" />
                <CardTitle className="mt-3 text-lg">03 · Earn cUSD</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Earn 0.05 cUSD per accepted submission and 0.01 cUSD per
                verification. Sweep your balance to MiniPay or any Celo
                wallet.
              </CardContent>
            </Card>
          </RevealOnScroll>
        </div>
      </section>

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
            <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
              <RecentSubmissions />
              <ZoneCoverage />
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </main>
  );
}
