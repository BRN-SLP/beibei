"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { PriceForm } from "@/components/submit/PriceForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ScanPage() {
  const { isConnected } = useAccount();
  const [barcode, setBarcode] = useState<string | null>(null);

  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Scan a price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected && (
            <p className="text-sm text-muted-foreground">
              Connect your wallet to submit. You can still test the scanner
              without connecting.
            </p>
          )}
          {barcode === null ? (
            <BarcodeScanner onDetected={setBarcode} />
          ) : (
            <PriceForm
              barcode={barcode}
              onCancel={() => setBarcode(null)}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
