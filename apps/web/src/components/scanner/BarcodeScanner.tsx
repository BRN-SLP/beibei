"use client";

import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  Keyboard,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onDetected: (text: string) => void;
}

type ScannerError =
  | { reason: "denied"; message: string }
  | { reason: "no_device"; message: string }
  | { reason: "in_use"; message: string }
  | { reason: "other"; message: string };

type ScannerState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "manual" }
  | { kind: "error"; error: ScannerError };

/**
 * Camera-driven barcode scanner with iOS Safari user-gesture compliance.
 *
 * Two non-obvious things this component has to get right:
 *
 *  1. iOS Safari (and desktop Safari + Chrome on macOS) requires
 *     `getUserMedia()` to be called **synchronously** inside a
 *     user-activation context. We call `decodeFromVideoDevice(...)`
 *     directly from `onClick` — no useEffect, no setTimeout — so the
 *     gesture is preserved and the permission prompt fires.
 *
 *  2. ZXing's `decodeFromVideoDevice` callback fires once per video
 *     frame with `(result, err, controls)`. The `err` is almost
 *     always a "no barcode in this frame" exception (`NotFoundException`,
 *     `NotFoundException2`, `ChecksumException`, `FormatException`, …).
 *     This is **normal scan noise** and must never flip the UI to an
 *     error state. Real fatal errors (permission denied, no device,
 *     camera in use) come back via the returned promise's `.catch`.
 *
 *     The previous version filtered only the literal name
 *     `NotFoundException`, which let `NotFoundException2` through and
 *     immediately collapsed the viewport, orphaning the MediaStream
 *     (controls were never captured in the ref, so unmount cleanup
 *     was a no-op and the camera LED stayed on).
 *
 * A launch-generation ref also guards against the race where controls
 * resolve after the user has tapped Restart or navigated away.
 *
 * Falls back to manual barcode entry on permission denial, no device,
 * or other failures.
 */
export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Monotonic generation: bumped on every launch + on unmount.
  // Any in-flight callbacks / promise resolutions that observe a
  // stale generation are responsible for stopping their own controls
  // instead of writing into `controlsRef`.
  const launchIdRef = useRef(0);
  const [state, setState] = useState<ScannerState>({ kind: "idle" });
  const [manualValue, setManualValue] = useState("");

  // Stop any active stream on unmount and invalidate any in-flight launch
  // so a late-arriving controls promise stops its own stream.
  useEffect(() => {
    return () => {
      launchIdRef.current += 1;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  /**
   * Tear down the entire camera workflow without starting a new one.
   *
   * Bumps `launchIdRef` so any in-flight `decodeFromVideoDevice` promise
   * resolves into a stale-launch branch (stops its own controls and does
   * not setState). Also stops any already-captured controls.
   *
   * MUST be called on every transition that leaves the camera flow
   * (error card → manual entry, scanning view → manual entry, etc.).
   * Otherwise a late-arriving `.then(controls => setState scanning)`
   * will clobber the manual state and drag the user back into a
   * black viewport while the leaked stream keeps the camera LED on.
   */
  const abandonLaunch = () => {
    launchIdRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  /**
   * Synchronous-from-gesture camera launcher. MUST be called from an
   * onClick / onTouchEnd handler so iOS Safari preserves the
   * user-activation context.
   */
  const launchCamera = () => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      setState({
        kind: "error",
        error: {
          reason: "other",
          message: "Video element not mounted yet — please retry.",
        },
      });
      return;
    }

    // Mark this launch attempt; if anything else bumps the generation
    // (unmount, restart, navigation) before our promise resolves, we
    // know to stop the late-arriving stream instead of leaking it.
    launchIdRef.current += 1;
    const myLaunchId = launchIdRef.current;

    setState({ kind: "starting" });
    stopCamera();

    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(undefined, videoEl, (result, _err, ctrls) => {
        // Stale callback from a previous launch — kill its stream and bail.
        if (myLaunchId !== launchIdRef.current) {
          ctrls.stop();
          return;
        }
        // Per-frame errors (no barcode this frame, checksum mismatch,
        // format mismatch) are decode-loop noise. Ignore unconditionally.
        // Fatal errors surface through the promise's .catch() instead.
        if (result) {
          const text = result.getText();
          if (text) {
            ctrls.stop();
            if ("vibrate" in navigator) navigator.vibrate?.(40);
            onDetected(text);
          }
        }
      })
      .then((controls) => {
        if (myLaunchId !== launchIdRef.current) {
          // User restarted / navigated away before camera finished
          // starting. Don't bind controls — just stop the stream.
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setState({ kind: "scanning" });
      })
      .catch((err: unknown) => {
        if (myLaunchId !== launchIdRef.current) return;
        setState({ kind: "error", error: categorize(err) });
      });
  };

  const showViewport =
    state.kind === "starting" || state.kind === "scanning";

  return (
    <div className="space-y-3">
      {/*
        Camera viewport. The <video> element is always mounted so that
        videoRef.current is live the moment the user taps the launch
        button — iOS Safari needs the call into getUserMedia to be
        synchronous-from-gesture, which means the video element must
        exist before the tap (we cannot mount it on state change).

        Critical: do NOT use `display: none` to hide the container when
        not scanning. Multiple browsers (including Chrome and Firefox)
        refuse to attach a MediaStream to a `<video>` whose ancestor is
        display:none — the stream is requested, the camera light goes
        on, but `.play()` never fires and the user sees nothing. We
        collapse the box visually with `h-0 + opacity-0 + border-0`
        instead, which keeps the video in the layout tree and lets the
        stream attach reliably.
      */}
      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-input bg-black transition-all",
          !showViewport && "h-0 opacity-0 border-0",
        )}
        aria-hidden={!showViewport}
      >
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-1/3 w-4/5 rounded-md border-2 border-white/80 shadow-[0_0_0_4096px_rgba(0,0,0,0.45)]" />
        </div>
        <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-white/80">
          {state.kind === "scanning"
            ? "Point camera at a barcode"
            : "Starting camera…"}
        </p>
      </div>

      {state.kind === "idle" && (
        <IdleStart
          onStart={launchCamera}
          onManual={() => setState({ kind: "manual" })}
        />
      )}

      {state.kind === "manual" && (
        <ManualEntry
          value={manualValue}
          onChange={(v) => setManualValue(v.replace(/\D/g, ""))}
          onSubmit={() => manualValue.length >= 8 && onDetected(manualValue)}
          onBackToCamera={launchCamera}
        />
      )}

      {state.kind === "error" && (
        <CameraEmptyState
          error={state.error}
          onRetry={launchCamera}
          onManual={() => {
            // Even from the error card we may have a still-in-flight
            // decodeFromVideoDevice() promise that will resolve into
            // a "scanning" setState and clobber the manual entry view.
            // abandonLaunch() bumps the generation so the late .then
            // takes the stale-launch branch.
            abandonLaunch();
            setState({ kind: "manual" });
          }}
        />
      )}

      {showViewport && (
        <div className="flex justify-between text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // launchCamera() itself bumps generation + stops controls,
              // so no separate abandonLaunch() needed here.
              launchCamera();
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Restart
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              abandonLaunch();
              setState({ kind: "manual" });
            }}
          >
            <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" />
            Type instead
          </Button>
        </div>
      )}
    </div>
  );
}

interface IdleStartProps {
  onStart: () => void;
  onManual: () => void;
}

function IdleStart({ onStart, onManual }: IdleStartProps) {
  return (
    <div className="space-y-4 rounded-md border border-dashed border-input bg-background p-6 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Camera className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Scan a product barcode
        </p>
        <p className="text-xs text-muted-foreground">
          Your browser will ask for camera permission. On iPhone the camera
          only opens after you tap.
        </p>
      </div>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <Button size="sm" onClick={onStart}>
          <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
          Tap to start camera
        </Button>
        <Button size="sm" variant="ghost" onClick={onManual}>
          <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" />
          Type barcode instead
        </Button>
      </div>
    </div>
  );
}

interface ManualEntryProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBackToCamera: () => void;
}

function ManualEntry({
  value,
  onChange,
  onSubmit,
  onBackToCamera,
}: ManualEntryProps) {
  return (
    <div className="space-y-3 rounded-md border border-input bg-background p-4">
      <label className="text-sm font-medium" htmlFor="manual-barcode">
        Enter barcode
      </label>
      <input
        id="manual-barcode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0123456789012"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={14}
        autoFocus
        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="text-[11px] text-muted-foreground">
        Read the digits printed under the barcode (EAN-13 or UPC-A). 8–13
        digits accepted.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={value.length < 8}
        >
          Use this code
        </Button>
        <Button size="sm" variant="ghost" onClick={onBackToCamera}>
          <Camera className="mr-2 h-4 w-4" aria-hidden="true" /> Back to camera
        </Button>
      </div>
    </div>
  );
}

interface CameraEmptyStateProps {
  error: ScannerError;
  onRetry: () => void;
  onManual: () => void;
}

function CameraEmptyState({ error, onRetry, onManual }: CameraEmptyStateProps) {
  const copy = COPY[error.reason];
  return (
    <div className="space-y-4 rounded-md border border-dashed border-input bg-background p-6 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {error.reason === "denied" ? (
          <ShieldAlert
            aria-hidden="true"
            className="h-6 w-6 text-destructive"
          />
        ) : (
          <CameraOff
            aria-hidden="true"
            className="h-6 w-6 text-muted-foreground"
          />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="text-xs text-muted-foreground">{copy.body}</p>
      </div>
      {copy.hint && (
        <p className="rounded-sm bg-muted/60 px-3 py-2 text-left font-mono text-[10px] leading-relaxed text-muted-foreground">
          {copy.hint}
        </p>
      )}
      {/* Always surface the underlying error text — helps users + us debug
          unexpected failures in the wild. */}
      <p className="font-mono text-[10px] text-muted-foreground/70">
        {error.message}
      </p>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <Button size="sm" onClick={onManual}>
          <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" />
          Type barcode manually
        </Button>
        <Button size="sm" variant="ghost" onClick={onRetry}>
          <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try camera again
        </Button>
      </div>
    </div>
  );
}

const COPY: Record<
  ScannerError["reason"],
  { title: string; body: string; hint?: string }
> = {
  denied: {
    title: "Camera permission blocked",
    body: "Your browser is preventing this page from using the camera. You can still submit prices by typing the barcode digits manually.",
    hint: "To re-enable on iPhone: Settings → Safari → Camera → Allow. Then reload the page.",
  },
  no_device: {
    title: "No camera detected",
    body: "We could not find a usable camera on this device. The manual entry path works just as well.",
  },
  in_use: {
    title: "Camera is busy",
    body: "Another app or tab is using the camera right now. Close it and tap retry, or skip to manual entry.",
  },
  other: {
    title: "Camera unavailable",
    body: "Something went wrong starting the scanner. Manual entry is always a safe fallback.",
  },
};

function categorize(err: unknown): ScannerError {
  const name =
    (err as { name?: string } | null | undefined)?.name?.toString() ?? "";
  const message =
    err instanceof Error ? err.message : String(err ?? "camera unavailable");
  if (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    message.toLowerCase().includes("permission")
  ) {
    return { reason: "denied", message };
  }
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    message.toLowerCase().includes("not found")
  ) {
    return { reason: "no_device", message };
  }
  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    message.toLowerCase().includes("in use")
  ) {
    return { reason: "in_use", message };
  }
  return { reason: "other", message };
}
