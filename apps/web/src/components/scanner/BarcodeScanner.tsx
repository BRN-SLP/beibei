"use client";

import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Camera, Keyboard, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onDetected: (text: string) => void;
}

type ScannerState =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "manual" }
  | { kind: "error"; message: string };

/**
 * Camera-driven barcode scanner. Falls back to a manual text input if the
 * browser denies `getUserMedia` or no camera is present (common in MiniPay
 * webviews and desktop). Caller is notified once a valid digit string is
 * available.
 */
export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [state, setState] = useState<ScannerState>({ kind: "starting" });
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    if (state.kind === "manual") return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    async function start() {
      if (!videoRef.current) return;
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err, ctrls) => {
            if (cancelled) {
              ctrls.stop();
              return;
            }
            if (result) {
              const text = result.getText();
              if (text) {
                ctrls.stop();
                if ("vibrate" in navigator) navigator.vibrate?.(40);
                onDetected(text);
              }
            }
            // Suppress NotFoundException — that's just "no barcode in frame".
            if (err && err.name && err.name !== "NotFoundException") {
              setState({ kind: "error", message: err.message });
            }
          },
        );
        controlsRef.current = controls;
        if (!cancelled) setState({ kind: "scanning" });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "camera unavailable";
        if (!cancelled) setState({ kind: "error", message });
      }
    }
    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected, state.kind]);

  if (state.kind === "manual") {
    return (
      <div className="space-y-3 rounded-md border border-input bg-background p-4">
        <label className="text-sm font-medium" htmlFor="manual-barcode">
          Enter barcode
        </label>
        <input
          id="manual-barcode"
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value.replace(/\D/g, ""))}
          placeholder="0123456789012"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={14}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => manualValue.length >= 8 && onDetected(manualValue)}
            disabled={manualValue.length < 8}
          >
            Use this code
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setState({ kind: "starting" })}
          >
            <Camera className="mr-2 h-4 w-4" /> Back to camera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border border-input bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          playsInline
          muted
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/3 w-4/5 rounded-md border-2 border-white/80 shadow-[0_0_0_4096px_rgba(0,0,0,0.45)]" />
        </div>
        <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-white/80">
          {state.kind === "scanning"
            ? "Point camera at a barcode"
            : state.kind === "error"
              ? `Camera error: ${state.message}`
              : "Starting camera…"}
        </p>
      </div>
      <div className="flex justify-between text-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            controlsRef.current?.stop();
            setState({ kind: "starting" });
          }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Restart
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            controlsRef.current?.stop();
            setState({ kind: "manual" });
          }}
        >
          <Keyboard className="mr-2 h-4 w-4" />
          Type instead
        </Button>
      </div>
    </div>
  );
}
