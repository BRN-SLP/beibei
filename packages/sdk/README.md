# @mercato/sdk

Read crowdsourced consumer-basket prices from the [Mercato](../../) on-chain oracle on Celo.

The contract is event-driven — `PriceSubmitted` + `Verified` + `SubmissionFinalized` are the source of truth. This SDK aggregates them into a single "current weighted-median price" view that any dapp can drop into their UI.

## Install

```bash
pnpm add @mercato/sdk viem
```

`viem` is a peer dependency.

## Usage

```ts
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import {
  getMedianPrice,
  barcodeStringToHex,
  gpsToZoneKey,
} from "@mercato/sdk";

const client = createPublicClient({ chain: celo, transport: http() });

const median = await getMedianPrice({
  publicClient: client,
  oracleAddress: "0x...", // Mercato proxy address
  barcode: barcodeStringToHex("0123456789012"),
  zoneKey: gpsToZoneKey(0.31, 32.58), // optional; omit for global median
});

// median = { priceCents: 459, sampleSize: 12 } | null
```

## API

- `getMedianPrice({ publicClient, oracleAddress, barcode, zoneKey?, fromBlock? })` — returns the weighted-median price (14-day half-life) across every accepted submission, or `null` if there are no accepted submissions yet.
- `barcodeStringToHex(digits)` — encodes an 8–13 digit EAN/UPC barcode into the on-chain `bytes12` representation. Drops the check digit.
- `gpsToZoneKey(lat, lng)` — packs lat/lng to a 6-byte zone key matching the on-chain `bytes6` format. ≈ 1.1 km grid resolution.
- `zoneKeyToGps(zoneKey)` — reverse of `gpsToZoneKey`.
- `weightedMedian(observations, nowSeconds?)` — pure helper, exposed for callers who already have observations in memory.
- `dailyMedianSeries(observations, daySpan?, nowSeconds?)` — daily-bucketed median series, useful for charts.
- `priceOracleAbi` — minimal viem-compatible ABI literal if you need to call other functions directly.

## License

MIT
