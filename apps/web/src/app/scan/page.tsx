"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

import { PriceForm } from "@/components/submit/PriceForm";

/**
 * Submit-a-price page.
 *
 * Lives at `/scan` for backwards compatibility with existing bookmark
 * links from earlier versions of the project. The route name will be
 * aliased to `/submit` in a follow-up middleware pass; the user-facing
 * label in the navbar already says "Submit" since the foundation PR.
 *
 * The legacy camera-based BarcodeScanner is dropped — Mercato uses a
 * canonical product dropdown instead. The scanner component is kept in
 * `components/scanner/` for now in case we want to re-introduce
 * barcode-aided product selection later, but the submit flow no longer
 * depends on it.
 */
export default function ScanPage() {
  const { isConnected } = useAccount();
  // Form-key bump trick: bumping a numeric key on the PriceForm forces
  // React to remount it, which clears local form state (selected
  // product, country, price, receipt) so the user can submit again
  // without a page reload after a successful submission.
  const [formKey, setFormKey] = useState(0);

  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      {!isConnected && (
        <p className="rounded-md border border-input bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Connect your wallet at the top right to submit. The form below
          works in preview mode without a wallet.
        </p>
      )}
      <PriceForm
        key={formKey}
        onCancel={() => setFormKey((k) => k + 1)}
      />
    </main>
  );
}
