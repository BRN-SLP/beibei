"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Single-click theme toggle for the navbar.
 *
 * Behavior:
 *   - First mount renders a disabled placeholder so the markup matches
 *     between server and client (next-themes only knows the resolved
 *     theme after hydration). This avoids a layout shift AND the
 *     classic "wrong icon flashes for one frame" issue.
 *   - Clicking flips between explicit "light" and "dark". The "system"
 *     option from the provider is still the first-visit default, but
 *     once a user has expressed a preference we keep them in that mode
 *     across reloads (next-themes persists to localStorage).
 *   - We rely on `resolvedTheme` (not `theme`) so that when the active
 *     setting is "system", the icon reflects the OS-resolved value —
 *     i.e. a system-dark user sees the Sun icon (meaning "click to go
 *     light") rather than an ambiguous moon.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      title={
        mounted ? (isDark ? "Switch to light" : "Switch to dark") : undefined
      }
      disabled={!mounted}
      className="text-muted-foreground hover:text-foreground"
    >
      {/* Render both icons; CSS positions them and toggles visibility.
          Avoids a hydration mismatch from a conditional return. */}
      <Sun
        aria-hidden="true"
        className={`h-4 w-4 transition-all ${
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Moon
        aria-hidden="true"
        className={`absolute h-4 w-4 transition-all ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        }`}
      />
    </Button>
  );
}
