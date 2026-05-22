import { Camera, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { HeroStatsServer } from "@/components/hero/HeroStatsServer";
import { RevealOnScroll } from "@/components/hero/RevealOnScroll";
import { Button } from "@/components/ui/button";
import { CountryBasketPreview } from "@/components/landing/CountryBasketPreview";
import { HeroLiveRankingServer } from "@/components/landing/HeroLiveRankingServer";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { RecentSubmissions } from "@/components/feed/RecentSubmissions";
import { Link } from "@/i18n/navigation";

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("hero");
  const tFeed = useTranslations("feed");

  return (
    <main className="flex-1">
      {/* HERO — split dashboard layout.
          MINIMAL §UX — "Zero decorative elements": no grid backdrop,
          no blob glow. Page leans on type + content rhythm.

          No section border-b — it was reading as an orphan horizontal
          line in the negative space between hero and HowItWorks. The
          composition now flows one section into the next without
          hard rules. */}
      <section className="relative">
        <div className="container mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-10 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-16 lg:pt-20 lg:pb-12">
          {/* Left — copy + CTAs. Stats moved out into their own
              full-width strip below so growing numbers don't reflow
              the hero, and UserBalance was removed entirely — it's a
              logged-in widget that belongs on /rewards, not as an
              alien card in the marketing hero. */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>{t("liveBadge")}</span>
            </div>

            <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              {t("title1")}
              <br />
              <span className="italic text-primary">{t("title2")}</span>
              <br />
              {t("title3")}
            </h1>

            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              {t("subtitle")}
            </p>

            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/scan">
                  <Camera className="mr-2 h-4 w-4" />
                  {t("cta_addPrice")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/rewards">
                  <Wallet className="mr-2 h-4 w-4" />
                  {t("cta_myRewards")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Right — Live country ranking. */}
          <div className="relative">
            <HeroLiveRankingServer />
          </div>
        </div>

        {/* Stats strip — full-width band immediately under the hero
            two-column composition. Three fixed-slot cells; values
            can grow without disturbing neighboring cells or the
            page geometry above. */}
        <div className="container mx-auto max-w-6xl px-4 pb-10 lg:pb-14">
          <HeroStatsServer />
        </div>
      </section>

      {/* HOW IT WORKS — editorial three-stage flow with artifact mocks. */}
      <HowItWorks />

      <CountryBasketPreview />

      <section className="border-t bg-secondary/40">
        <div className="container mx-auto max-w-5xl px-4 py-20">
          <RevealOnScroll>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {tFeed("section")}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  {tFeed("title")}
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
