import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Honest, plain-language terms for an open-source public-good project.
 *
 * Length matters: regulators / MiniPay reviewers want to confirm a
 * Terms link exists and is non-empty. Users want to understand the
 * rules in 30 seconds. We optimise for both: short clear sections
 * over a 20-page legal block that nobody reads.
 *
 * If the project pivots to anything that handles user funds, KYC, or
 * collects personal data, this file MUST be replaced by reviewed
 * legal copy. Today the contract only handles peer-verified public
 * price observations + a fixed-cap reward pool from the founder's
 * wallet, no custody, no fiat, no PII, so plain language is
 * sufficient.
 */
export default async function TermsPage() {
  const tLegal = await getTranslations("legal");
  const t = await getTranslations("legal.terms");

  const code = (chunks: React.ReactNode) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
      {chunks}
    </code>
  );

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
        {tLegal("kicker")}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
        {t("h1")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {tLegal("lastUpdated")}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("what.h2")}
          </h2>
          <p>
            {t.rich("what.body", {
              link: (chunks) => (
                <Link
                  href="https://github.com/BRN-SLP/mercato"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("warranties.h2")}
          </h2>
          <p>
            {t.rich("warranties.body", {
              link: (chunks) => (
                <Link
                  href="https://celoscan.io/address/0x18DD82604a9439b3Cdb7E1078c355E460ED217Ed#code"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("rewards.h2")}
          </h2>
          <p>{t.rich("rewards.body", { code })}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("use.h2")}
          </h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>{t("use.honest")}</li>
            <li>{t("use.noattack")}</li>
            <li>{t("use.permanent")}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("opendata.h2")}
          </h2>
          <p>{t("opendata.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {t("changes.h2")}
          </h2>
          <p>{t("changes.body")}</p>
        </section>
      </div>
    </main>
  );
}
