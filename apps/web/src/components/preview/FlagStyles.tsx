/**
 * Four candidate flag treatments shown side-by-side at /preview/flags
 * so the user can pick visually.
 *
 * Selective imports — `country-flag-icons/react/3x2` re-exports ~250
 * country components, and the wildcard pulls them all into the bundle.
 * Mercato only ships 15 launch countries; we list them explicitly so
 * the rest get tree-shaken out.
 */

import AR from "country-flag-icons/react/3x2/AR";
import BR from "country-flag-icons/react/3x2/BR";
import CH from "country-flag-icons/react/3x2/CH";
import DE from "country-flag-icons/react/3x2/DE";
import ES from "country-flag-icons/react/3x2/ES";
import GB from "country-flag-icons/react/3x2/GB";
import JP from "country-flag-icons/react/3x2/JP";
import KE from "country-flag-icons/react/3x2/KE";
import NG from "country-flag-icons/react/3x2/NG";
import PH from "country-flag-icons/react/3x2/PH";
import PL from "country-flag-icons/react/3x2/PL";
import PT from "country-flag-icons/react/3x2/PT";
import TR from "country-flag-icons/react/3x2/TR";
import UA from "country-flag-icons/react/3x2/UA";
import US from "country-flag-icons/react/3x2/US";

import { getCountryAccent } from "@/lib/country-accents";

// `country-flag-icons` types its flag components with its own internal
// `Props` shape (`HTMLAttributes & SVGAttributes` of a synthetic
// HTMLSVGElement), which doesn't structurally match React's
// `SVGProps<SVGSVGElement>`. We pass no props at the call sites — just
// `<Flag />` — so type inference works fine without an explicit
// `Record<string, FlagComponent>` annotation that would force a cast.
const FlagsByCode = {
  AR,
  BR,
  CH,
  DE,
  ES,
  GB,
  JP,
  KE,
  NG,
  PH,
  PL,
  PT,
  TR,
  UA,
  US,
} as const;

type FlagCode = keyof typeof FlagsByCode;

interface FlagStyleProps {
  code: string;
}

/**
 * Style 1 — Monochrome SVG flag.
 *
 * `country-flag-icons` only ships colour SVGs; the monochrome read
 * comes from a CSS filter (`grayscale + contrast + brightness`).
 */
export function MonoSvgFlag({ code }: FlagStyleProps) {
  const Flag = FlagsByCode[code as FlagCode];
  if (!Flag) return <FallbackCode code={code} />;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-6 overflow-hidden rounded-[1px] [filter:grayscale(1)_contrast(1.15)_brightness(0.9)]"
      >
        <Flag />
      </span>
      <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/80">
        {code}
      </span>
    </span>
  );
}

/**
 * Style 1b — 75% desaturated SVG flag.
 *
 * Half-step between full mono and full colour: keeps about 25% of the
 * flag's chroma so a few key hues (UA blue, BR green) still read as
 * identity, but the saturation is low enough that the row of flags
 * doesn't shout against the editorial palette.
 */
export function Desaturated75Flag({ code }: FlagStyleProps) {
  const Flag = FlagsByCode[code as FlagCode];
  if (!Flag) return <FallbackCode code={code} />;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-6 overflow-hidden rounded-[1px] ring-1 ring-border/40 [filter:grayscale(0.75)_contrast(1.05)_brightness(0.95)]"
      >
        <Flag />
      </span>
      <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/80">
        {code}
      </span>
    </span>
  );
}

/**
 * Style 2 — Small colour SVG flag next to ISO code.
 */
export function ColorSvgFlag({ code }: FlagStyleProps) {
  const Flag = FlagsByCode[code as FlagCode];
  if (!Flag) return <FallbackCode code={code} />;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-6 overflow-hidden rounded-[1px] ring-1 ring-border/40"
      >
        <Flag />
      </span>
      <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/80">
        {code}
      </span>
    </span>
  );
}

/**
 * Style 3 — ISO code pill only (the current production treatment).
 */
export function IsoCodeOnly({ code }: FlagStyleProps) {
  return (
    <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/80">
      {code}
    </span>
  );
}

/**
 * Style 4 — Code pill + 4px colour accent stripe from the flag's
 * dominant ink. Abstract identity through colour, no emoji or literal
 * flag glyph.
 */
export function CodeWithStripe({ code }: FlagStyleProps) {
  const accent = getCountryAccent(code);
  return (
    <span className="inline-flex h-7 items-stretch overflow-hidden rounded-sm border border-border/60 bg-card/40">
      <span
        aria-hidden="true"
        className="w-1"
        style={{ backgroundColor: accent }}
      />
      <span className="inline-flex w-10 items-center justify-center font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/80">
        {code}
      </span>
    </span>
  );
}

function FallbackCode({ code }: FlagStyleProps) {
  return (
    <span className="inline-flex h-7 w-10 items-center justify-center rounded-sm border border-dashed border-border font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
      {code}
    </span>
  );
}
