import type { Metadata } from "next";

import {
  ColorSvgFlag,
  CodeWithStripe,
  DesaturatedFlag,
  IsoCodeOnly,
  MonoSvgFlag,
} from "@/components/preview/FlagStyles";
import { COUNTRIES } from "@/lib/countries";

/**
 * Internal preview route. Side-by-side comparison of four candidate
 * flag treatments across the 15 launch countries so the user can
 * pick the one that fits the editorial register without committing
 * to a refactor blind.
 *
 * NOT linked from anywhere in the site nav — hit directly at
 * /preview/flags. Excluded from sitemaps too via the `robots`
 * metadata below.
 */
export const metadata: Metadata = {
  title: "Flag style preview · Mercato",
  robots: { index: false, follow: false },
};

const STYLES = [
  {
    key: "mono",
    label: "Mono SVG",
    blurb: "Real flag, fully desaturated. Sits in the editorial register.",
    Render: MonoSvgFlag,
  },
  {
    key: "desat44",
    label: "Desat 44%",
    blurb: "Real flag, 56% chroma left. Identity reads cleanly, still sits in the palette.",
    Render: DesaturatedFlag,
  },
  {
    key: "color",
    label: "Color SVG",
    blurb: "Real flag, full chroma. Most recognisable but breaks palette.",
    Render: ColorSvgFlag,
  },
  {
    key: "iso",
    label: "ISO code",
    blurb: "Current production treatment. Restrained, no flag glyph at all.",
    Render: IsoCodeOnly,
  },
  {
    key: "stripe",
    label: "Code + accent",
    blurb: "ISO code pill with a 4px colour stripe from the flag's dominant ink.",
    Render: CodeWithStripe,
  },
] as const;

export default function FlagPreviewPage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          internal · not linked
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Flag style preview
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Five candidate treatments for country identity across the site,
          rendered across the 15 launch countries. Pick one. The
          chosen style replaces the current ISO-only pill in
          CountryBasketPreview, RecentSubmissions, HeroLiveRanking,
          the /basket pages, and the submit dropdown.
        </p>
      </header>

      {/* Style legend strip — four headers above the rows. */}
      <div className="mb-3 grid grid-cols-[6rem_repeat(5,1fr)] items-end gap-x-6 px-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Country
        </span>
        {STYLES.map((s) => (
          <span
            key={s.key}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Per-style blurb row */}
      <div className="mb-6 grid grid-cols-[6rem_repeat(5,1fr)] items-start gap-x-6 px-3">
        <span aria-hidden="true" />
        {STYLES.map((s) => (
          <p
            key={s.key}
            className="max-w-[16ch] text-[11px] leading-snug text-muted-foreground"
          >
            {s.blurb}
          </p>
        ))}
      </div>

      <ol className="divide-y divide-border/60 border-y border-border/60">
        {COUNTRIES.map((country) => (
          <li
            key={country.code}
            className="grid grid-cols-[6rem_repeat(5,1fr)] items-center gap-x-6 px-3 py-5"
          >
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {country.name}
            </div>
            {STYLES.map((s) => (
              <div key={s.key}>
                <s.Render code={country.code} />
              </div>
            ))}
          </li>
        ))}
      </ol>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        next · pick a style, tell the agent, ship across the rest of the site
      </p>
    </main>
  );
}
