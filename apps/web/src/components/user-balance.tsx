"use client";

import { useAccount, useBalance } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { truncateAddress } from "@/lib/app-utils";

// MiniPay-compliant stablecoin list — no CELO surfaced to the user.
// MiniPay pays network fees automatically via CIP-64 fee abstraction;
// showing a CELO balance only confuses non-crypto-native users.
const CUSD_ADDRESS = "0x765de816845861e75a25fca122bb6898b8b1282a";
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

function BalanceDisplay({
  address,
  token,
  symbol,
}: {
  address: `0x${string}`;
  token: `0x${string}`;
  symbol: string;
}) {
  const { data, isLoading } = useBalance({ address, token });

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{symbol}</span>
      <span className="font-medium">
        {isLoading
          ? "—"
          : parseFloat(data?.formatted || "0").toFixed(4)}
      </span>
    </div>
  );
}

export function UserBalance() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Your balances</CardTitle>
        <p
          className="text-sm text-muted-foreground pt-1 font-mono"
          title={address}
        >
          {truncateAddress(address)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 pt-2 border-t">
          <BalanceDisplay address={address} token={CUSD_ADDRESS} symbol="cUSD" />
          <BalanceDisplay address={address} token={USDC_ADDRESS} symbol="USDC" />
          <BalanceDisplay address={address} token={USDT_ADDRESS} symbol="USDT" />
        </div>
      </CardContent>
    </Card>
  );
}
