"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface StatTickerProps {
  value: number;
  label: string;
  format?: (n: number) => string;
}

/**
 * Count-up number ticker for the BeiBei hero stats grid. Animates from
 * 0 to value over 1.4s with easeOutCubic. Respects reduced-motion.
 */
export function StatTicker({ value, label, format }: StatTickerProps) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(prefersReduced ? value : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, prefersReduced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-md border border-primary/15 bg-card/60 p-3 backdrop-blur"
    >
      <p className="font-numeric text-2xl font-semibold tracking-tight text-foreground">
        {format ? format(display) : display.toLocaleString()}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </motion.div>
  );
}
