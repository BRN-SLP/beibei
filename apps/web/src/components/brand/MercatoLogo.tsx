/**
 * Mercato brand mark.
 *
 * Two variants:
 *   - `icon`     — basket only, ~1:1 square. Used in the navbar and as a
 *                  general-purpose icon mark. Fill follows `currentColor`,
 *                  so the parent's text color drives the basket color.
 *                  Wrap in `text-primary` for deep green, in
 *                  `text-foreground` for theme-aware (cream on dark green,
 *                  deep green on cream).
 *   - `wordmark` — "Mercato" hand-drawn wordmark + basket as the final
 *                  "o". Same currentColor rule applies — the whole mark
 *                  inherits one ink color from the parent.
 *
 * Why inline SVG (not next/image of the static .svg):
 *   1. `currentColor` only works on inline SVG paths. A static .svg
 *      served as an <img> can't inherit theme colors.
 *   2. No extra network request — the icon ships in the page HTML.
 *   3. Aria-friendly: the consumer owns the accessible name via the
 *      enclosing element's aria-label; the SVG itself is aria-hidden.
 *
 * The path data below is a hand-painted, brush-stroke rendering. It's
 * literal SVG output from the brand source file (apps/web/public/brand/
 * mercato-logo.svg), simplified to the minimum needed to render the
 * basket silhouette + the wordmark glyphs cleanly at every size from
 * 16px favicon up to 512px hero.
 */

import { cn } from "@/lib/utils";

type MercatoLogoVariant = "icon" | "wordmark";

interface MercatoLogoProps {
  variant?: MercatoLogoVariant;
  className?: string;
  /**
   * If provided, the inline SVG renders an accessible label. Omit when
   * the enclosing element already owns the accessible name (e.g. the
   * navbar Link with aria-label="Mercato — home") to avoid double
   * announcement by screen readers.
   */
  ariaLabel?: string;
}

export function MercatoLogo({
  variant = "icon",
  className,
  ariaLabel,
}: MercatoLogoProps) {
  const labelProps = ariaLabel
    ? { role: "img" as const, "aria-label": ariaLabel }
    : { "aria-hidden": true as const };

  if (variant === "wordmark") {
    return (
      <svg
        viewBox="0 0 1024 240"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("inline-block", className)}
        {...labelProps}
      >
        {/* Wordmark "Mercato" rendered as Fraunces italic via SVG <text>
            so theming via currentColor remains clean. The "o" is
            replaced with a basket glyph drawn from path data. */}
        <text
          x="0"
          y="180"
          fontFamily="var(--font-serif, 'Fraunces'), Georgia, serif"
          fontSize="200"
          fontWeight="700"
          fontStyle="italic"
          fill="currentColor"
          letterSpacing="-6"
        >
          Mercat
        </text>
        {/* Basket glyph as final "o", positioned to align with the
            baseline of the wordmark. Hand-drawn shape — thick brush
            stroke matched to the wordmark weight. */}
        <g transform="translate(820, 60) scale(1.4)">
          <BasketGlyph />
        </g>
      </svg>
    );
  }

  // Icon variant — basket only, 1:1 square.
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      {...labelProps}
    >
      <g transform="translate(8, 12) scale(0.85)">
        <BasketGlyph />
      </g>
    </svg>
  );
}

/**
 * Basket silhouette as a single-fill path group. All fills are
 * `currentColor` so the parent's text color drives the basket color.
 *
 * The shape is intentionally chunky and slightly imperfect — same
 * brush-painted character as the wordmark. Designed to read at 16px
 * (favicon) and 512px (hero) equally well.
 */
function BasketGlyph() {
  return (
    <g fill="currentColor">
      {/* Handle */}
      <path d="M28 18 Q28 4 50 4 Q72 4 72 18 L68 18 Q68 10 50 10 Q32 10 32 18 Z" />
      {/* Rim — twisted weave hint */}
      <path d="M8 22 L92 22 Q88 30 50 30 Q12 30 8 22 Z" />
      {/* Body */}
      <path d="M12 30 L88 30 L82 80 Q80 88 50 88 Q20 88 18 80 Z" />
      {/* Inner weave strokes — three diagonals, off-white reverse for depth */}
      <path
        d="M18 42 L82 38 M16 56 L84 52 M20 70 L80 66"
        stroke="var(--bg-stroke, transparent)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}
