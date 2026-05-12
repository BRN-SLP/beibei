"use client";

import { useEffect, useState } from "react";

export interface GeolocationState {
  status: "idle" | "requesting" | "ok" | "error";
  lat?: number;
  lng?: number;
  error?: string;
}

/**
 * One-shot geolocation request. Caller can call `refresh()` to re-query.
 */
export function useGeolocation(): GeolocationState & { refresh: () => void } {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });
  const [token, setToken] = useState(0);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "error", error: "geolocation unavailable" });
      return;
    }
    setState({ status: "requesting" });
    const id = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setState({
          status: "error",
          error: err.message || "permission denied",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
    return () => {
      // getCurrentPosition has no cancel — leaving `id` for forward compat.
      void id;
    };
  }, [token]);

  return { ...state, refresh: () => setToken((t) => t + 1) };
}
