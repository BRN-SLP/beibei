"use client";

import { motion, useReducedMotion } from "framer-motion";

const STRIPES = [
  { x: 0, w: 6 },
  { x: 10, w: 3 },
  { x: 16, w: 8 },
  { x: 28, w: 4 },
  { x: 36, w: 6 },
  { x: 46, w: 3 },
  { x: 53, w: 7 },
  { x: 64, w: 5 },
  { x: 73, w: 4 },
  { x: 81, w: 8 },
  { x: 93, w: 3 },
  { x: 100, w: 5 },
  { x: 109, w: 7 },
  { x: 120, w: 4 },
  { x: 128, w: 6 },
];

/**
 * Animated barcode used in the BeiBei hero. Renders a 16:9 panel:
 *   - Tall cyan stripes that shimmer when the scan beam passes them.
 *   - A single amber scan beam that sweeps top→bottom on loop.
 *   - Reduced-motion: static stripes, no beam.
 */
export function AnimatedBarcode() {
  const prefersReduced = useReducedMotion();
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-primary/20 bg-card shadow-[0_0_60px_-20px_hsl(var(--primary)/0.45)]">
      {/* Grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.25) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Barcode stripes */}
      <svg
        viewBox="0 0 138 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {STRIPES.map((s, i) => (
          <motion.rect
            key={i}
            x={s.x}
            y={18}
            width={s.w}
            height={64}
            fill="currentColor"
            className="text-primary"
            initial={prefersReduced ? false : { opacity: 0.6 }}
            animate={
              prefersReduced
                ? undefined
                : {
                    opacity: [0.55, 1, 0.55],
                  }
            }
            transition={
              prefersReduced
                ? undefined
                : {
                    duration: 2,
                    delay: i * 0.06,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </svg>

      {/* Scan beam */}
      {!prefersReduced && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_4px_hsl(var(--accent)/0.6)]"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Corner brackets */}
      <CornerBracket className="left-2 top-2" rotate={0} />
      <CornerBracket className="right-2 top-2" rotate={90} />
      <CornerBracket className="right-2 bottom-2" rotate={180} />
      <CornerBracket className="left-2 bottom-2" rotate={270} />

      {/* Status row */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary/80">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span>scanning · sepolia</span>
      </div>
    </div>
  );
}

function CornerBracket({
  className,
  rotate,
}: {
  className?: string;
  rotate: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute h-3 w-3 ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="absolute left-0 top-0 h-full w-px bg-primary/70" />
      <div className="absolute left-0 top-0 h-px w-full bg-primary/70" />
    </div>
  );
}
