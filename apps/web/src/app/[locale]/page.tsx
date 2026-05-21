import { Camera, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { HeroStatsServer } from "@/components/hero/HeroStatsServer";
import { RevealOnScroll } from "@/components/hero/RevealOnScroll";
import { Button } from "@/components/ui/button";
import { CountryBasketPreview } from "@/components/landing/CountryBasketPreview";
import { HeroLiveRankingServer } from "@/components/landing/HeroLiveRankingServer";
import { RecentSubmissions } from "@/components/feed/RecentSubmissions";
import { UserBalance } from "@/components/user-balance";
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
  const tHow = useTranslations("howItWorks");
  const tFeed = useTranslations("feed");

  return (
    <main className="flex-1">
      {/* HERO — split dashboard layout.
          MINIMAL §UX — "Zero decorative elements": no grid backdrop,
          no blob glow. Page leans on type + content rhythm. */}
      <section className="relative border-b">
        <div className="container mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-20">
          {/* Left — copy + live stats */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>{t("liveBadge")}</span>
            </div>

            <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              {t("title1")}
              <br />
              <span className="italic text-primary">{t("title2")}</span>
              <br />
              {t("title3")}
            </h1>

            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              {t("subtitle")}
            </p>

            <HeroStatsServer />

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

            <UserBalance />
          </div>

          {/* Right — Live country ranking. */}
          <div className="relative">
            <HeroLiveRankingServer />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — editorial three-step. */}
      <section className="container mx-auto max-w-5xl px-4 py-24">
        <RevealOnScroll>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            {tHow("section")}
          </p>
          <h2 className="mb-16 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {tHow("title1")}{" "}
            <span className="italic text-primary">{tHow("title2")}</span>
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
                  {tHow("step1Title")}
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  {tHow("step1Body")}
                </p>
              </div>
            </li>
          </RevealOnScroll>

          <RevealOnScroll delay={0.06}>
            <li className="grid items-baseline gap-x-10 gap-y-4 md:grid-cols-[1fr_auto] md:text-right">
              <div className="space-y-3 md:order-1 md:pt-4">
                <h3 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  {tHow("step2Title")}{" "}
                  <span className="italic text-primary">
                    {tHow("step2TitleAccent")}
                  </span>
                </h3>
                <p className="ml-auto max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  {tHow("step2Body")}
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
                  {tHow("step3Title")}
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
                  {tHow("step3Body")}
                </p>
              </div>
            </li>
          </RevealOnScroll>
        </ol>
      </section>

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
