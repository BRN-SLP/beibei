/**
 * MiniPay helpers — detection and deeplink construction.
 *
 * The auto-connect logic for MiniPay context already lives inside
 * `components/wallet-provider.tsx`. This module exposes additional helpers.
 */

export const CUSD_MAINNET_ADDRESS =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

export function isMiniPayContext(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } })
    .ethereum;
  if (eth?.isMiniPay) return true;
  return /MiniPay|Opera Mini/i.test(navigator.userAgent);
}

export function openInMiniPayUrl(targetUrl: string): string {
  return `https://minipay.celo.org/open?url=${encodeURIComponent(targetUrl)}`;
}

export const MINIPAY_TX_OVERRIDES = {
  feeCurrency: CUSD_MAINNET_ADDRESS,
} as const;
