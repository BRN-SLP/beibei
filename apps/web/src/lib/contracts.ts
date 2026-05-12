import { celo, celoSepolia } from "wagmi/chains";

import { erc20Abi, priceOracleAbi } from "./abi";

export const SUPPORTED_CHAIN_IDS = [celo.id, celoSepolia.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export const ADDRESSES: Record<
  SupportedChainId,
  { priceOracle: `0x${string}` | undefined; cUSD: `0x${string}` | undefined }
> = {
  [celo.id]: {
    priceOracle: (process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS_MAINNET ||
      undefined) as `0x${string}` | undefined,
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  },
  [celoSepolia.id]: {
    priceOracle: (process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS_SEPOLIA ||
      undefined) as `0x${string}` | undefined,
    cUSD: (process.env.NEXT_PUBLIC_CUSD_ADDRESS_SEPOLIA || undefined) as
      | `0x${string}`
      | undefined,
  },
};

export function getPriceOracleAddress(chainId: number): `0x${string}` {
  const cfg = ADDRESSES[chainId as SupportedChainId];
  if (!cfg?.priceOracle) {
    throw new Error(
      `PriceOracle address not configured for chainId=${chainId}`,
    );
  }
  return cfg.priceOracle;
}

export function getCUSDAddress(chainId: number): `0x${string}` {
  const cfg = ADDRESSES[chainId as SupportedChainId];
  if (!cfg?.cUSD) {
    throw new Error(`cUSD address not configured for chainId=${chainId}`);
  }
  return cfg.cUSD;
}

export { priceOracleAbi, erc20Abi };
