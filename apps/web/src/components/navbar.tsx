"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Menu, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConnectButton } from "@/components/connect-button";
import { MercatoLogo } from "@/components/brand/MercatoLogo";
import { FxBaseToggle } from "@/components/fx-base-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";

interface NavLink {
  /** Translation key under nav.* */
  key: "home" | "basket" | "submit" | "rewards";
  href: string;
  external?: boolean;
}

// Routes — `/scan` is the legacy submit-a-price URL kept stable so
// existing deep links continue to resolve; the label maps via i18n.
// Order: Home → Basket (read) → Submit (write) → Rewards (claim) —
// follows the user journey arc.
const navLinks: NavLink[] = [
  { key: "home", href: "/" },
  { key: "basket", href: "/basket" },
  { key: "submit", href: "/scan" },
  { key: "rewards", href: "/rewards" },
];

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Mobile menu — h-11 w-11 enforces 44px touch target (WCAG 2.5.5) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("menu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="mb-8 flex items-center text-primary">
                <MercatoLogo className="h-7" />
              </div>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className={`flex items-center gap-2 text-base font-medium transition-colors hover:text-primary ${
                      pathname === link.href ? "text-foreground" : "text-foreground/70"
                    }`}
                  >
                    {t(link.key)}
                    {link.external && <ExternalLink className="h-4 w-4" />}
                  </Link>
                ))}
                <div className="mt-6 flex flex-col gap-4 border-t pt-6">
                  <Suspense fallback={null}>
                    <LanguageSwitcher />
                  </Suspense>
                  <Suspense fallback={null}>
                    <FxBaseToggle />
                  </Suspense>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <ConnectButton />
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo — geometric wordmark + sun-over-horizon glyph,
              single combined mark. */}
          <Link
            href="/"
            className="flex items-center text-primary transition-opacity hover:opacity-80"
            aria-label={t("logoAria")}
          >
            <MercatoLogo className="h-7 sm:h-8" />
          </Link>
        </div>

        {/* Desktop navigation — split into two visual groups so the
            primary nav (Home/Basket/Submit/Rewards) reads as page
            navigation while the locale / currency / theme / wallet
            controls cluster reads as session settings. The two groups
            are pushed apart by ml-10 + pl-6 on the controls cluster
            so users don't visually merge "English" with the nav
            links. */}
        <nav className="hidden items-center md:flex">
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/70"
                }`}
              >
                {t(link.key)}
                {link.external && <ExternalLink className="h-4 w-4" />}
              </Link>
            ))}
          </div>

          <div className="ml-10 flex items-center gap-3 border-l border-border/40 pl-6">
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
            <Suspense fallback={null}>
              <FxBaseToggle />
            </Suspense>
            <ThemeToggle />
            <ConnectButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
