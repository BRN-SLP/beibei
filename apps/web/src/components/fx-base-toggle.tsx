"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";

import { FX_BASE_COOKIE, type FxBase } from "@/lib/fx-base-types";

/**
 * Currency-base switcher.
 *
 * Three states: local (each price in its country's native currency),
 * USD, EUR. Selection writes the mercato-fx-base cookie and triggers
 * a router refresh so server-rendered price components re-evaluate
 * against the new base on the next paint, no client conversion math
 * needed at the leaves.
 *
 * Native <select> for the same reason LanguageSwitcher uses one,
 * works on every device without a combobox dependency.
 */
export function FxBaseToggle() {
  const t = useTranslations("fxBaseToggle");
  const router = useRouter();
  const [base, setBase] = useState<FxBase>("local");
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const raw = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${FX_BASE_COOKIE}=`))
      ?.split("=")[1];
    if (raw === "USD" || raw === "EUR") setBase(raw);
    setHydrated(true);
  }, []);

  function handleChange(next: FxBase) {
    setBase(next);
    if (next === "local") {
      document.cookie = `${FX_BASE_COOKIE}=; path=/; max-age=0`;
    } else {
      // One year is the convention for "remember my display
      // preference" cookies; renews on every set.
      document.cookie = `${FX_BASE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
    startTransition(() => router.refresh());
  }

  return (
    <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={base}
        disabled={!hydrated || isPending}
        onChange={(e) => handleChange(e.target.value as FxBase)}
        className="cursor-pointer bg-transparent text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        aria-label={t("label")}
      >
        <option value="local">{t("local")}</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </label>
  );
}
