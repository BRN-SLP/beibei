"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { AlertTriangle, Plug } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Mercato-branded connect button.
 *
 * Terminal / dashboard aesthetic: square corners, mono labels, primary
 * accents with a pulsing status dot. Built on RainbowKit's
 * `ConnectButton.Custom` for full visual control with their modal flow
 * intact.
 *
 * States:
 *   1. Disconnected — outlined cyan rectangle with "[ connect ]" mono
 *      label and a plug icon.
 *   2. Connected — split rectangle: left half shows the chain badge
 *      with a pulsing accent dot (clickable → chain switcher); right
 *      half shows the truncated address in monospace (clickable →
 *      account modal).
 *   3. Wrong network — single rose-bordered rectangle with warning.
 *
 * Inside MiniPay's injected Opera wallet the entire control hides.
 */
export function ConnectButton() {
  const [isMinipay, setIsMinipay] = useState(false);

  useEffect(() => {
    const eth = (window as { ethereum?: { isMiniPay?: boolean } }).ethereum;
    if (eth?.isMiniPay) setIsMinipay(true);
  }, []);

  if (isMinipay) return null;

  return (
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            aria-hidden={!ready ? "true" : undefined}
            style={!ready ? { opacity: 0, pointerEvents: "none" } : undefined}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    type="button"
                    onClick={openConnectModal}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/5 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-primary shadow-[0_0_18px_-6px_hsl(var(--primary)/0.5)] transition hover:bg-primary/10 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Plug
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform group-hover:rotate-12"
                    />
                    <span>[ connect ]</span>
                  </motion.button>
                );
              }

              if (chain.unsupported) {
                return (
                  <motion.button
                    type="button"
                    onClick={openChainModal}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-destructive"
                  >
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>wrong net</span>
                  </motion.button>
                );
              }

              return (
                <div className="inline-flex items-stretch overflow-hidden rounded-sm border border-primary/30 bg-background/60 backdrop-blur">
                  <motion.button
                    type="button"
                    onClick={openChainModal}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 border-r border-primary/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Switch network (current: ${chain.name})`}
                  >
                    <span aria-hidden="true" className="relative inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full bg-accent/60" />
                    </span>
                    <span className="hidden sm:inline">{shortenChain(chain.name ?? "")}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={openAccountModal}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Account details"
                  >
                    <span className="font-numeric tracking-tight">
                      {account.displayName}
                    </span>
                    {account.displayBalance && (
                      <span className="hidden text-muted-foreground sm:inline">
                        · {account.displayBalance}
                      </span>
                    )}
                  </motion.button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  );
}

/** Short network label for the terminal-style pill. */
function shortenChain(name: string): string {
  return name.replace(/celo\s*/i, "").trim() || name;
}
