/**
 * `<CountryMark>` — production canonical country identifier.
 *
 * Replaces the bare ISO-code pill that used to sit in every
 * country-bearing surface. After the /preview/flags A/B exercise,
 * the chosen treatment is a 40%-desaturated SVG flag next to a
 * mono-caps ISO code pill — about 60% chroma left, so identity
 * hues (UA blue, BR green, JP red) read clearly without breaking
 * the cream + deep-green palette.
 *
 * One file, one source of truth: every surface that shows a
 * country (basket preview, recent submissions, hero ranking,
 * /basket index + detail, item page) consumes this so the desat
 * level + pill geometry stay consistent.
 *
 * Selective imports for the 15 launch countries keep the bundle
 * tight — country-flag-icons ships ~250 components and we never
 * want all of them.
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

const FLAGS = {
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

type FlagComponent = typeof FLAGS[keyof typeof FLAGS];
// Wide map (string key → maybe component) so a non-launch country code
// — e.g. mis-typed `xx` — returns undefined at runtime and we fall
// back to the ISO pill alone. The `as const` narrowing on `FLAGS` would
// otherwise make TS believe every lookup is defined.
const FLAG_LOOKUP: Readonly<Record<string, FlagComponent | undefined>> = FLAGS;

interface CountryMarkProps {
  code: string;
  /**
   * Visual size variant.
   *   - `sm`: row in dense list / hero ranking row
   *   - `md`: default — basket preview rows, feed rows
   *   - `lg`: country detail header
   */
  size?: "sm" | "md" | "lg";
  /**
   * If true, the wrapping border + bg are dropped — useful when
   * the parent already provides its own chrome (e.g. inside a tab
   * button). Defaults to false.
   */
  bare?: boolean;
  className?: string;
}

const FLAG_DIMS: Record<NonNullable<CountryMarkProps["size"]>, string> = {
  sm: "h-3.5 w-5",
  md: "h-4 w-6",
  lg: "h-6 w-9",
};

const PILL_DIMS: Record<NonNullable<CountryMarkProps["size"]>, string> = {
  sm: "h-5 min-w-[2.25rem] px-1.5 text-[9px]",
  md: "h-7 w-10 text-[10px]",
  lg: "h-12 w-16 text-base",
};

const PILL_TRACKING: Record<NonNullable<CountryMarkProps["size"]>, string> = {
  sm: "tracking-[0.16em]",
  md: "tracking-[0.18em]",
  lg: "tracking-[0.2em]",
};

export function CountryMark({
  code,
  size = "md",
  bare = false,
  className,
}: CountryMarkProps) {
  const upper = code.toUpperCase();
  const Flag: FlagComponent | undefined = FLAG_LOOKUP[upper];
  const flagDim = FLAG_DIMS[size];
  const pillDim = PILL_DIMS[size];
  const pillTracking = PILL_TRACKING[size];

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`.trim()}
    >
      {Flag && (
        <span
          aria-hidden="true"
          className={`inline-flex overflow-hidden rounded-[1px] ring-1 ring-border/40 [filter:grayscale(0.40)_contrast(1.05)_brightness(0.97)] ${flagDim}`}
        >
          <Flag />
        </span>
      )}
      <span
        aria-hidden={Flag ? "true" : undefined}
        className={
          bare
            ? `inline-flex items-center justify-center font-mono font-semibold text-foreground/80 ${pillDim} ${pillTracking}`
            : `inline-flex items-center justify-center rounded-sm border border-border/60 bg-card/40 font-mono font-semibold text-foreground/80 ${pillDim} ${pillTracking}`
        }
      >
        {upper}
      </span>
    </span>
  );
}
