/**
 * Off-chain weighted median price calculation.
 *
 * Inputs are accepted submissions for one (barcode, zoneKey) pair. We weight
 * each observation by recency on a half-life of 14 days, then pick the price
 * at the cumulative-weight midpoint of the sorted list.
 */

export interface PriceObservation {
  priceCents: number;
  timestampSeconds: number;
}

const HALF_LIFE_SECONDS = 14 * 24 * 3600;

export function weightedMedian(
  observations: PriceObservation[],
  nowSeconds: number = Math.floor(Date.now() / 1000),
): number | null {
  if (observations.length === 0) return null;
  const weighted = observations.map((o) => ({
    price: o.priceCents,
    weight: Math.pow(0.5, (nowSeconds - o.timestampSeconds) / HALF_LIFE_SECONDS),
  }));
  weighted.sort((a, b) => a.price - b.price);

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let acc = 0;
  for (const w of weighted) {
    acc += w.weight;
    if (acc >= totalWeight / 2) return w.price;
  }
  return weighted[weighted.length - 1].price;
}

/** Group observations into daily buckets, returning median per bucket. */
export function dailyMedianSeries(
  observations: PriceObservation[],
  daySpan = 30,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Array<{ day: number; median: number; sampleSize: number }> {
  const buckets = new Map<number, PriceObservation[]>();
  const cutoff = nowSeconds - daySpan * 86_400;
  for (const o of observations) {
    if (o.timestampSeconds < cutoff) continue;
    const day = Math.floor(o.timestampSeconds / 86_400);
    const arr = buckets.get(day) ?? [];
    arr.push(o);
    buckets.set(day, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, arr]) => ({
      day,
      median: weightedMedian(arr, nowSeconds) ?? 0,
      sampleSize: arr.length,
    }));
}
