"use client";

import { useChainId } from "wagmi";
import { useMemo } from "react";
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { zoneKeyToGps } from "@/lib/zone";
import { findSeedLabel } from "@/lib/seed-labels";

interface ZonePoint {
  lng: number;
  lat: number;
  count: number;
  city: string;
  flag: string;
  label: string;
}

/**
 * Lightweight world-coverage scatter: each finalized submission becomes a
 * point at its (lng, lat). Points are sized by how many submissions exist
 * in that zone, so visiting cities cluster naturally. Reference lines mark
 * the equator and prime meridian for spatial orientation.
 *
 * Avoids a real map library on purpose — recharts is already a dep, and
 * 8 well-spread points across Africa do not need pan/zoom interaction.
 */
export function ZoneCoverage() {
  const chainId = useChainId();
  const { records, loading } = usePriceFeed(chainId);

  const points = useMemo<ZonePoint[]>(() => {
    const byZone = new Map<string, ZonePoint>();
    for (const r of records) {
      let zone: { lat: number; lng: number };
      try {
        zone = zoneKeyToGps(r.zoneKey);
      } catch {
        continue;
      }
      const key = `${zone.lat.toFixed(2)},${zone.lng.toFixed(2)}`;
      const meta = findSeedLabel(r.barcode);
      const existing = byZone.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byZone.set(key, {
          lng: zone.lng,
          lat: zone.lat,
          count: 1,
          city: meta?.city ?? "—",
          flag: meta?.flag ?? "🌍",
          label: meta?.label ?? "Unknown product",
        });
      }
    }
    return Array.from(byZone.values());
  }, [records]);

  const isEmpty = !loading && points.length === 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            zone coverage · lat × lng
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            {points.length} zone{points.length === 1 ? "" : "s"}
          </p>
        </div>
        {isEmpty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No submissions yet. Once verified prices land, this map fills up.
          </p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="lng"
                  name="lng"
                  domain={[-20, 50]}
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v.toFixed(0)}°`}
                />
                <YAxis
                  type="number"
                  dataKey="lat"
                  name="lat"
                  domain={[-35, 35]}
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v.toFixed(0)}°`}
                />
                <ZAxis dataKey="count" range={[60, 360]} name="count" />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <ReferenceLine
                  x={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.375rem",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload as ZonePoint;
                    return (
                      <div className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                        <p className="font-medium">
                          {p.flag} {p.city}
                        </p>
                        <p className="text-muted-foreground">
                          {p.lat.toFixed(2)}°, {p.lng.toFixed(2)}°
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                          {p.count} submission{p.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="submissions"
                  data={points}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.75}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
