"use client";

import { Github, LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChainId } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";

import { Link } from "@/i18n/navigation";

const VERSION = "0.2.0-alpha";
const REPO_URL = "https://github.com/BRN-SLP/mercato";
const SUPPORT_URL = "https://github.com/BRN-SLP/mercato/issues";

export function Footer() {
  const t = useTranslations("footer");
  const chainId = useChainId();
  const networkLabel =
    chainId === celo.id
      ? { name: "Celo Mainnet", color: "bg-emerald-500" }
      : chainId === celoSepolia.id
        ? { name: "Celo Sepolia", color: "bg-accent" }
        : { name: t("networkUnsupported"), color: "bg-destructive" };

  return (
    <footer className="border-t bg-background/60 backdrop-blur">
      <div className="container mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand + version */}
        <div className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="font-semibold text-foreground">Mercato</span>
          <span>{t("version", { version: VERSION })}</span>
        </div>

        {/* Trust links — Terms / Privacy / Support */}
        <nav
          aria-label={t("legalAria")}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          <Link href="/legal/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("support")}</span>
          </a>
        </nav>

        {/* Network + repo */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${networkLabel.color}`}
            />
            <span className="text-muted-foreground">{networkLabel.name}</span>
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label={t("githubAria")}
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span>{t("github")}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
