# BeiBei

> **The on-chain price index for everyday African goods.** Scan a barcode, type the price you paid, your zone verifies it — three matching votes finalize the median and pay micro-rewards in cUSD.

🟢 **Live:** https://beibei-rho.vercel.app
🧪 **Sepolia PriceOracle proxy:** [`0x9f3dc5C587415Dd551fA49fB0e3be47c66C9685B`](https://celo-sepolia.blockscout.com/address/0x9f3dc5C587415Dd551fA49fB0e3be47c66C9685B) (V2Rewards impl)
📖 **Talent App / Proof of Ship May edition** — eligible: MiniPay hook ✓, Celo contract ✓, OS repo ✓

---

What does a 2 kg bag of Pembe maize flour cost this week in Westlands vs the CBD? What's the median price of cooking oil in Kisumu compared to Mombasa? Until now, that data lived in WhatsApp groups and personal memory. BeiBei moves it on-chain.

A shopper scans a barcode in any kiosk, enters the price they paid (optionally a receipt photo), and their submission goes on-chain as a single transaction. Other users in the same 1.1 km zone tap ✓ or ✗. Three matching positives → consensus → the price is finalized and **everyone involved earns cUSD**: 0.05 cUSD to the submitter, 0.01 cUSD to each of the three verifiers.

- 📷 **Scan** any UPC/EAN-13 barcode from the camera. iOS Safari user-gesture compliant; falls back to manual entry if the camera is blocked.
- 🗳️ **Verify** nearby pending submissions with a single tap. Consensus at three matching votes.
- 💸 **Earn** 0.05 cUSD per accepted submission + 0.01 cUSD per verification of an accepted submission. Sweep accumulated rewards in one claim.
- 📈 **Read** the daily weighted median price for any item over the last 30 days, per zone — useful for travel, budgeting, anti-overcharging.

## Reward economics

The launch values (`0.001 / 0.0002 cUSD`) were tuned around a Sybil-farm risk model — but they were too small to motivate real shoppers. Real users in KE/NG/GH/ZA need the per-action reward to clear their cognitive cost of acting; Sybil farmers don't. The logics are opposite, so the right move is to bias toward real users and accept a finite seed-pool ceiling as the Sybil cap.

**V2Rewards (live on Sepolia, ships to Mainnet at launch)** bumps to:
- `SUBMITTER_REWARD = 0.05 cUSD` (~6.9 KES — visible but not large)
- `VERIFIER_REWARD = 0.01 cUSD` (~1.4 KES per tap)

UUPS-upgradeable: future V3 ships anti-Sybil gates (wallet-age threshold, daily cap, $1 bond, outlier flag) via `upgradeProxy` reusing the V1 storage gap, without redeploying or migrating data.

## Architecture

| Layer | Tech |
|---|---|
| Web app | Next.js 14 (App Router), TypeScript, TailwindCSS, Radix UI, [@composer-kit/ui](https://www.composerkit.xyz/) |
| Web3 client | viem 2.x + wagmi 2.x + RainbowKit |
| Smart contract | UUPS-upgradeable Solidity 0.8.28 on Celo, OpenZeppelin contracts-upgradeable 5.6 |
| Barcode scanner | [@zxing/browser](https://github.com/zxing-js/browser) with user-gesture iOS Safari support |
| Receipt storage | Vercel Blob (photos), content-addressed by keccak256 |
| Charts | recharts (median feed + zone coverage scatter) |
| MiniPay | Auto-detect via `window.ethereum.isMiniPay` + UA; force `feeCurrency: cUSD` |
| Monorepo | Turborepo |

Submissions are identified by a monotonic `submissionId` from the contract. Locations are bucketed to a 2-decimal lat/lng grid (~1.1 km) packed as `bytes6`. Barcodes stored as `bytes12` (EAN-13/UPC check digit dropped to fit). Consensus is 3-of-3 verifications matching; mixed votes leave a submission in a locked-pending state (V3 adds a 7-day auto-finalize).

## Why Celo

cUSD as gas + stable unit-of-account means a shopper can scan, submit, verify, and claim — all in one currency they already understand. MiniPay's ~8M wallets in Africa preinstalled with cUSD make the distribution channel obvious. Sub-cent gas means a 0.01 cUSD verification reward is not eaten by the transaction itself.

## Project Structure

```
apps/web                Next.js application (landing, scan, item feed, rewards)
apps/contracts          Hardhat: PriceOracle.sol + V2Rewards
apps/contracts/seed     Curated launch product catalog (8 items across KE/NG/GH/ZA)
apps/contracts/scripts  deploy.ts, upgrade-rewards.ts, seed-submissions.ts, seed-rewards.ts
packages/sdk            @beibei/sdk — public read helpers (npm)
```

## Quick start

```bash
pnpm install
pnpm dev                 # runs Next.js dev server on :3000
```

Copy `.env.example` to the appropriate `.env` files. The web app reads `apps/web/.env.local`; the contracts read `apps/contracts/.env`.

## Smart contract scripts

```bash
pnpm contracts:compile                  # compile Solidity
pnpm contracts:test                     # 17 Hardhat tests: submit / verify / consensus / claim / UUPS
pnpm contracts:deploy:celo-sepolia      # deploy V2Rewards proxy to Celo Sepolia
pnpm contracts:deploy:celo              # deploy V2Rewards proxy to Celo Mainnet (single tx)
pnpm contracts:seed-rewards:celo        # transfer initial cUSD reward pool into the proxy
pnpm contracts:seed-submissions:celo    # seed 8 curated submissions + 3-of-3 verifications
```

After deploy the script prints proxy + implementation addresses. Verify on Celoscan:

```bash
cd apps/contracts
pnpm hardhat verify --network celo-sepolia <implementation-address>
```

## Tests

```bash
pnpm contracts:test                # 17 Hardhat tests, includes UUPS upgrade rehearsal
pnpm --filter web test:e2e         # Playwright smoke tests against dev server
```

## License

MIT — see [LICENSE](./LICENSE).
