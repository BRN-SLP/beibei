"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { dailyMedianSeries } from "@/lib/median";
import type { SubmissionRecord } from "@/hooks/usePriceFeed";

interface MedianChartProps {
  submissions: SubmissionRecord[];
}

export function MedianChart({ submissions }: MedianChartProps) {
  const observations = submissions
    .filter((s) => s.finalized && s.accepted)
    .map((s) => ({
      priceCents: Number(s.priceCents),
      timestampSeconds: Number(s.timestamp),
    }));
  const series = dailyMedianSeries(observations);

  if (series.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
        No accepted submissions in the last 30 days yet.
      </p>
    );
  }

  const data = series.map((s) => ({
    date: new Date(s.day * 86_400_000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    price: s.median / 100,
    sampleSize: s.sampleSize,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            opacity={0.6}
          />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            width={56}
          />
          <Tooltip
            content={<MedianTooltip />}
            cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3 }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ fill: "hsl(var(--primary))", r: 3 }}
            activeDot={{
              r: 5,
              fill: "hsl(var(--accent))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MedianTooltipPayload {
  date?: string;
  price?: number;
  sampleSize?: number;
}

function MedianTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as MedianTooltipPayload | undefined;
  const price = data?.price;
  const sampleSize = data?.sampleSize;
  return (
    <div className="rounded-sm border border-primary/30 bg-background/95 px-3 py-2 font-mono text-xs shadow-lg backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-numeric mt-1 text-base font-semibold text-foreground">
        ${typeof price === "number" ? price.toFixed(2) : "—"}
      </p>
      {typeof sampleSize === "number" && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          n = {sampleSize}
        </p>
      )}
    </div>
  );
}
