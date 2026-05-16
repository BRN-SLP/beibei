"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import { useChainId } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";

const VERSION = "0.1.0-alpha";
const REPO_URL = "https://github.com/BRN-SLP/beibei";

export function Footer() {
  const chainId = useChainId();
  const networkLabel =
    chainId === celo.id
      ? { name: "Celo Mainnet", color: "bg-emerald-500" }
      : chainId === celoSepolia.id
        ? { name: "Celo Sepolia", color: "bg-accent" }
        : { name: "Unsupported chain", color: "bg-destructive" };

  return (
    <footer className="border-t bg-background/60 backdrop-blur">
      <div className="container mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="font-semibold text-foreground">BeiBei</span>
          <span>
            v{VERSION} · mit · crowdsourced prices · celo
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${networkLabel.color}`}
            />
            <span className="text-muted-foreground">{networkLabel.name}</span>
          </span>
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span>github</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
