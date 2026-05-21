# Mercato

> **Crowdsourced consumer price basket on Celo.** Pick a product, pick your country, type the price you paid. Verified peers earn cUSD micro-rewards. A daily, verifiable, country-by-country cost-of-living index — the open alternative to Numbeo.

🟢 **Live:** https://mercato-rho.vercel.app
🧪 **Sepolia PriceOracle proxy:** [`0x9f3dc5C587415Dd551fA49fB0e3be47c66C9685B`](https://celo-sepolia.blockscout.com/address/0x9f3dc5C587415Dd551fA49fB0e3be47c66C9685B)
🌐 **Mainnet PriceOracle proxy:** [`0x18DD82604a9439b3Cdb7E1078c355E460ED217Ed`](https://celoscan.io/address/0x18DD82604a9439b3Cdb7E1078c355E460ED217Ed)

---

What does a litre of milk cost this week in Kyiv vs Buenos Aires? What's the median rent for a one-bedroom in Lisbon vs Lagos? Until now, that data lived behind Numbeo paywalls and untraceable user submissions. Mercato moves it on-chain.

Anyone in any country picks a product from our canonical basket of ~33 everyday goods — bread, milk, eggs, rent, transport, internet, utilities — enters the current local price, optionally attaches a photo proof, and their submission goes on-chain as a single transaction. Three other community members in the same country tap ✓ or ✗. Three matching positives → consensus → the price is finalized and the submitter + verifiers each earn a small cUSD micro-reward from the project's seed pool.

The result is an open, verifiable, daily cost-of-living index across countries — built by the people who actually pay those prices.

- 🛒 **Pick** a product and a country. No barcode scanning required: aren't we tracking baskets, not SKUs.
- 🗳️ **Verify** nearby pending submissions with a single tap. Consensus at three matching votes.
- 💸 **Earn** cUSD micro-rewards per accepted submission and per verification of an accepted submission. Sweep accumulated rewards in one claim.
- 📈 **Read** the daily basket value for any country, normalized to USD for cross-country comparison — useful for inflation tracking, expat budgeting, anti-overcharging, journalism.

## Reward economics

Mainnet launches with conservative bytecode constants: `SUBMITTER_REWARD = 0.001 cUSD`, `VERIFIER_REWARD = 0.0002 cUSD`. A 10 cUSD seed pool covers roughly 6 250 full consensus cycles — enough headroom for the launch period. The numbers are deliberately small because the project bootstraps from the founder's wallet with no external revenue stream yet, and anti-Sybil gates aren't shipped, so a finite pool ceiling is the de-facto cap.

The contract is **UUPS-upgradeable** — Sepolia has the same proxy upgraded to `PriceOracleV2Rewards` (50× bump, impl `0xc429cDDce1143B1AFd3040AE8E1FFb81c2e0A5D2`) as a rehearsal proving the mechanism works. Future V3 will add Sybil-mitigation gates (wallet-age threshold, daily cap, optional bond) via the same `upgradeProxy` pattern reusing the V1 storage gap — no redeploy, no data migration.

## Architecture

| Layer | Tech |
|---|---|
| Web app | Next.js 14 (App Router), TypeScript, TailwindCSS, Radix UI |
| Web3 client | viem 2.x + wagmi 2.x + RainbowKit |
| Smart contract | UUPS-upgradeable Solidity 0.8.28 on Celo, OpenZeppelin contracts-upgradeable 5.6 |
| Product encoding | `keccak256(productSlug)` truncated to bytes12 — 33 canonical items, room for thousands more |
| Country encoding | ISO-3166-1 alpha-2 padded to bytes6 |
| Receipt storage | Vercel Blob (photos), content-addressed by keccak256 |
| MiniPay | Auto-detect via `window.ethereum.isMiniPay`; fee-abstracted with `feeCurrency: cUSD` |
| Monorepo | Turborepo |

The on-chain contract is a generic `(bytes12 productId, bytes6 zoneKey, uint64 priceCents, bytes32 receiptHash)` price submitter — neutral to whatever the client encodes into those slots. Mercato encodes the product as `keccak256(productSlug)` truncated to 12 bytes and the country as ISO-3166-1 alpha-2 padded ASCII. The encoding is pure off-chain, so the same contract can host other consumer-price experiments without redeployment. Currency is determined offchain from the country mapping (cUSD/cEUR/cREAL/cKES/eXOF/cGHS/cCOP/cPHP via Mento, or local fiat for non-Mento currencies).

## Why Celo

Mento stablecoins (cUSD, cEUR, cREAL, cKES, eXOF, cGHS, cCOP, cPHP) give native local-currency rails in the exact emerging markets where price volatility matters most. Sub-cent gas on Celo means a 0.001 cUSD micro-reward is economically meaningful. MiniPay distribution reaches mobile-first contributors across Africa, LATAM, SE Asia without the friction of a separate wallet app. Fee abstraction lets users pay gas in cUSD, removing the "buy CELO first" onboarding wall.

## Project Structure

```
apps/web                Next.js application (landing, submit, country index, rewards)
apps/contracts          Hardhat: PriceOracle.sol + V2Rewards
apps/contracts/scripts  deploy.ts, upgrade-rewards.ts, seed-rewards.ts
packages/sdk            @mercato/sdk — public read helpers (npm)
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
pnpm contracts:test                     # Hardhat tests: submit / verify / consensus / claim / UUPS
pnpm contracts:deploy:celo-sepolia      # deploy V2Rewards proxy to Celo Sepolia
pnpm contracts:deploy:celo              # deploy V2Rewards proxy to Celo Mainnet (single tx)
pnpm contracts:seed:celo                # transfer initial cUSD reward pool into the proxy
pnpm contracts:seed-mercato:celo        # submit + verify the 15-row Mercato launch fixture
```

`seed-mercato` reads `apps/contracts/seed/mercato.ts` — 15 curated submissions across UA, AR, KE, DE, US. Idempotent (re-runs skip already-submitted rows). Required env: `PRIVATE_KEY`, `DEPLOYER_MNEMONIC`, `PRICE_ORACLE_ADDRESS`.

After deploy the script prints proxy + implementation addresses. Verify on Celoscan:

```bash
cd apps/contracts
pnpm hardhat verify --network celo-sepolia <implementation-address>
```

## Tests

```bash
pnpm contracts:test                # Hardhat tests, includes UUPS upgrade rehearsal
pnpm --filter web test:e2e         # Playwright smoke tests against dev server
```

## License

MIT — see [LICENSE](./LICENSE).
