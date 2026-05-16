"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast surface for BeiBei. Terminal aesthetic: bottom-right
 * placement (closer to the camera/submit interaction zone on mobile),
 * mono font, sharp corners, no rich-color tints to keep the cyan/amber
 * brand consistent.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "font-mono text-xs rounded-sm border border-primary/30 bg-background text-foreground shadow-lg backdrop-blur",
          title: "text-xs uppercase tracking-[0.14em] font-semibold",
          description: "text-[11px] text-muted-foreground normal-case tracking-normal",
          actionButton:
            "text-[10px] uppercase tracking-[0.18em] bg-primary text-primary-foreground rounded-sm px-2 py-1",
          cancelButton:
            "text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
          success: "border-primary/40",
          error: "border-destructive/60",
        },
      }}
    />
  );
}
