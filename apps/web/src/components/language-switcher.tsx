"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Footer language switcher.
 *
 * Compact native `<select>` so it works on every device (iOS picker,
 * Android wheel, desktop dropdown) without bringing in a heavy combobox.
 * On change we router.replace the same pathname with the new locale —
 * keeps the user on the page they're reading, just in a new language.
 *
 * Display is the locale code in uppercase (EN, UK, ES, PT-BR, DE, FR)
 * to keep the navbar control compact alongside the FX base toggle.
 * Codes are universally recognisable and avoid the wide footprint of
 * translated language names like "Português (BR)".
 */
export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: Locale) => {
    startTransition(() => {
      // Preserve query string when switching locale. usePathname()
      // drops search params, so on routes like /basket?country=UA a
      // naive router.replace(pathname, ...) would strip ?country=UA
      // and bounce the user back to the index. Re-attach the search
      // string so the user stays on the exact same view, just in a
      // different language.
      const search = searchParams.toString();
      const target = search ? `${pathname}?${search}` : pathname;
      router.replace(target, { locale: nextLocale });
    });
  };

  return (
    <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as Locale)}
        className="cursor-pointer bg-transparent text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        aria-label={t("label")}
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
