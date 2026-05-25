"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";

import { PriceForm } from "@/components/submit/PriceForm";

/**
 * Client half of /scan, extracted so the page route stays a
 * server component and can await `<RecentSubmissions />` from the
 * server pipeline without coercing the whole page into the client.
 *
 * Owns the wallet-connection callout and the form-remount key.
 */
export function ScanClient() {
  const { isConnected } = useAccount();
  const t = useTranslations("scan");
  // Bumping a numeric key on the PriceForm forces React to remount
  // it, which clears local form state (selected product, country,
  // price, receipt) so the user can submit again without a page
  // reload after a successful submission.
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-6">
      {!isConnected && (
        <p className="rounded-md border border-input bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("connectPrompt")}
        </p>
      )}
      <PriceForm key={formKey} onCancel={() => setFormKey((k) => k + 1)} />
    </div>
  );
}
