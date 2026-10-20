# DreamDex-Findings

**Feedback-track submission for the [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) (DoraHacks, Track 1: Feedback).**

An independent review of dreamDEX perpetuals on the **Somnia Tokyo testnet (Hideki, chain 50383)**, covering the contracts' observable behaviour, the TypeScript SDK, the indexer API, the testnet app, the developer and trader documentation, and the official bot kit's perp strategies. Each of the 25 findings is reproducible from this repository with read-only scripts, and every log in `evidence/` records the block range and versions it ran against.

| Severity | Count | Reward per accepted item |
|---|---|---|
| Critical | **0** | $40 |
| Major | **7** | $40 |
| Normal | **18** | $15 |
| **Total** | **25** | |

---

## Contents

1. [Scope](#scope)
2. [Methodology](#methodology)
3. [Severity rubric](#severity-rubric)
4. [Findings](#findings)
   - [Critical](#critical)
   - [Major](#major)
   - [Normal](#normal)
5. [Investigated and ruled out](#investigated-and-ruled-out)
6. [Observations not filed](#observations-not-filed)
7. [Reproducing the findings](#reproducing-the-findings)
8. [Repository layout](#repository-layout)
9. [Versions and endpoints](#versions-and-endpoints)
10. [Disclosure](#disclosure)

---

## Scope

| Component | Version / location | What was exercised |
|---|---|---|
| SDK | `@somnia-chain/markets-sdk` **0.32.1** (the version the dreamDEX developer docs name as "the one the app runs") | Unified exchange layer (`loadMarkets`, `fetchTicker`, `fetchOrderBook`, `fetchTrades`, `fetchOHLCV`, `fetchFundingRate`, `fetchPositions`, `fetchOpenOrders`, `fetchBalance`, `fetchPortfolioAnalytics`, `createOrder` path, precision helpers); perp client reads (`listPerpMarkets`, `getPerpSystemConfig`, `getMaxPerpOrderSize`, `getPerpPosition`, `listPerpPositions`, `listPerpPositionAnalytics`, `getAccountHealth`, `getMarginAccount`, `getLiquidationPrice`, `getPerpLeverage`, `getPerpRiskParams`, `getPerpFeedStatus`, `getPerpSideHolders`, `getInsuranceFundState`, `getLiquidationEngineConfig`); stop-order build path; exported ABIs and address sets |
| Indexer API | `https://hideki-dev.smk.somnia.host/v1/graphql` | Market registry, positions, open orders (`PerpPortfolio`), stop orders, candles |
| Contracts (behaviour only) | PerpPool, MarginBank, PerpStopOrderRegistry on Hideki | Order placement gates, minimum size, expiry, position cap, fill price band, stop-pair validation, all observed through `eth_call` |
| Developer docs | `/docs/developers/perps-testnet` | Network, contracts, connect snippet, sizing, raw/operator calls, pitfalls |
| Trader docs | `/docs/trading/perps-testnet` | Market table (leverage, margins, ticks, minimums, OI caps), costs |
| Bot kit | [`somnia-chain/dreamdex-bot-kit`](https://github.com/somnia-chain/dreamdex-bot-kit) @ [`2579866`](https://github.com/somnia-chain/dreamdex-bot-kit/tree/25798660bbe4674a6f83a960b202852896e2fed4) | `packages/perp-core`, `strategies/perp-starter`, `perp-maker`, `perp-guard`, `perp-funding`, Railway deployment config |

## Methodology

- **Read-only by design.** No private key was used and no transaction was sent. Contract behaviour was established with `eth_call` simulations from existing public testnet accounts, pinned to a specific block where it matters. Calldata that embeds the owner (stop orders) was built through an address-only wallet client that has no key.
- **Cross-checking, not just calling.** Each SDK read was compared against an independent source: the pool's own `eth_call` result, the raw on-chain order book (`getAllOpenOrdersOffChain`), the indexer, or the docs. A finding is filed only where two sources disagree in a way that matters.
- **Pinned to the SDK's own block.** Where the SDK reports `asOfBlock`, simulations ran at exactly that block, so price movement between reads can't explain a mismatch. Several early mismatches disappeared under this control and were **dropped** (see [ruled out](#investigated-and-ruled-out)).
- **Population checks.** Holder lists for all 21 markets (7,142 accounts) were enumerated from the MarginBank and scanned for health; open interest and risk parameters were read for every market.
- **Re-verified.** Every filed finding was reproduced at least twice, at different blocks, before being written up. The logs in `evidence/` are from the final run.

## Severity rubric

Severity follows the bounty's three levels. The definitions below are the ones applied here, chosen conservatively.

| Level | Applied when |
|---|---|
| **Critical** | Loss or theft of funds, broken solvency or liquidation, or a bypass of a protocol control. Reproducible without special access. |
| **Major** | A documented API, SDK or kit behaviour is wrong in a way that makes correct client code fail on chain, lose track of orders or positions, or act on the wrong market state. Also used for missing features whose absence forces unsafe workarounds in trading code. |
| **Normal** | Incorrect or incomplete documentation, misleading metadata or messages, and gaps that cost developer time but don't by themselves cause wrong trades. |

## Findings

IDs are stable: findings added after the first round take the next free number (MAJOR-18, NORMAL-19 … NORMAL-25), so an ID never changes meaning once published. The tables below group them by severity.

### Critical

**None filed.** No issue met the critical bar under the rubric above. The money-safety controls that could be tested held: withdrawals enforce margin and the paper-USDso credit floor, credit claims are once per address, wrong-side stop pairs are rejected, fills are price-banded, and no account was left below maintenance margin. Each candidate is listed under [Investigated and ruled out](#investigated-and-ruled-out).

### Major

| ID | Area | Finding | Impact in one line |
|---|---|---|---|
| [MAJOR-01](feedback/MAJOR-01-sdk-max-order-size-ignores-resting-orders.md) | SDK | `getMaxPerpOrderSize` ignores the account's resting same-side orders under the position cap | A "Max" order reverts `MaxPositionSizeExceeded`. Reproduced on 11 market-sides at the SDK's own block. |
| [MAJOR-02](feedback/MAJOR-02-sdk-create-order-below-min-quantity.md) | SDK | Unified `createOrder` checks only "≥ one lot"; perp minimums are 9–69 lots | Undersized orders are mined and revert `QuantityBelowMinimum`, costing gas. |
| [MAJOR-03](feedback/MAJOR-03-botkit-shannon-addresses-on-hideki.md) | SDK | Bot kit builds Hideki clients with the Shannon address set | Pool status discovery fails silently; halted or close-only markets look tradeable to every perp strategy. |
| [MAJOR-04](feedback/MAJOR-04-botkit-perp-starter-wrong-side-bracket.md) | SDK | `perp-starter` brackets an existing position using `PERP_SIDE`, not the position's side | The bot crashes leaving no TP/SL, or (with a trading key) takes "profit" at a loss and "stops out" in profit. |
| [MAJOR-05](feedback/MAJOR-05-botkit-perp-maker-loses-live-quotes.md) | SDK | `perp-maker` drops quote IDs whose cancel failed and exits outside its cleanup path | RPC errors leave quotes resting unmanaged at stale prices, multiplied by automatic restarts. |
| [MAJOR-06](feedback/MAJOR-06-missing-reduce-only-orders.md) | contracts | No reduce-only flag for regular perp orders; `params.reduceOnly` is silently ignored (the trader docs advertise reduce-only orders) | A close sized from a stale read can open the opposite position. |
| [MAJOR-18](feedback/MAJOR-18-contracts-withdrawable-view-overstates.md) | contracts | `MarginBank.getWithdrawableCollateral` (SDK `withdrawable`) ignores unrealized PnL and margin | Overstates by up to 5.5×, once above total equity; withdrawing it reverts on 4 of 4 accounts with positions. |

### Normal

| ID | Area | Finding |
|---|---|---|
| [NORMAL-07](feedback/NORMAL-07-sdk-unified-amount-precision-wrong-for-large-lots.md) | SDK | `precision.amount` is `0` on markets whose lot is 10 or 100 (1000PEPE, PUMP, DOGE), so it doesn't describe the size grid |
| [NORMAL-08](feedback/NORMAL-08-sdk-perp-write-abi-missing-operator-functions.md) | SDK | No exported ABI contains `placeOrderFor` / `placeOrdersFor` / `cancelOrderFor`, which the docs tell raw callers to use |
| [NORMAL-09](feedback/NORMAL-09-docs-raw-order-expiry-undocumented.md) | docs | The raw-call docs don't say what `expireTimestampNs` to pass; `0` reverts `OrderAlreadyExpired` |
| [NORMAL-10](feedback/NORMAL-10-docs-oi-cap-table-stale.md) | docs | The OI cap column is wrong on 20 of 21 markets; "a tenth per account" holds on 1 of 21 |
| [NORMAL-11](feedback/NORMAL-11-docs-sdk-perps-guide-stale.md) | docs | The SDK's bundled `PERPS.md` lists 2 markets with symbols that don't exist; 21 are live |
| [NORMAL-12](feedback/NORMAL-12-sdk-portfolio-timeframe-error.md) | SDK | `fetchPortfolioAnalytics("1d")` fails with "windowStart … NaN" instead of naming the valid timeframes |
| [NORMAL-13](feedback/NORMAL-13-sdk-fetch-balance-omits-perps-margin.md) | SDK | `fetchBalance` omits the Perps account: about 2,000 USDso of margin shows as 0.56 USDso |
| [NORMAL-14](feedback/NORMAL-14-botkit-sdk-version-pinned-below-documented.md) | SDK | Bot kit pins `^0.31.0` / `^0.30.0`, which can never install the documented 0.32.1 |
| [NORMAL-15](feedback/NORMAL-15-sdk-load-markets-fails-open-on-discovery-error.md) | SDK | `loadMarkets` fails open: status discovery errors leave every perp `active: true` |
| [NORMAL-16](feedback/NORMAL-16-docs-network-has-three-names.md) | docs | The perps network is "Tokyo", "Hideki" or "DreamDEX region" depending on the page; nothing links them |
| [NORMAL-17](feedback/NORMAL-17-botkit-stop-deposit-labelled-somi.md) | SDK | Bot kit tells testnet users stop deposits are in SOMI; on the perps testnet they are STT |
| [NORMAL-19](feedback/NORMAL-19-app-withdraw-ceiling-wrong-for-paper-usdso.md) | app | App's perps withdraw ceiling ignores the paper-USDso credit floor: offers amounts that revert, or 0 when 20.88 USDso is withdrawable |
| [NORMAL-20](feedback/NORMAL-20-docs-paper-usdso-market-restriction-not-in-effect.md) | docs | Docs exclude paper USDso from six markets; on chain it can open on all 21 (stale docs or misconfigured allowlist) |
| [NORMAL-21](feedback/NORMAL-21-docs-paper-usdso-leverage-change.md) | docs | Docs say paper-USDso leverage "can't be changed"; `setMaxLeverage` succeeds 18 of 18 times |
| [NORMAL-22](feedback/NORMAL-22-docs-backstop-bidders.md) | docs | Docs say no backstop bidders are registered; the LiquidationEngine reports `bidderCount: 1` |
| [NORMAL-23](feedback/NORMAL-23-docs-funding-direction-baseline.md) | docs | "Perp below index ⇒ shorts pay" is false on 8 of 21 markets: an undocumented +0.01%/8h baseline makes longs pay |
| [NORMAL-24](feedback/NORMAL-24-docs-errors-page-missing-perp-errors.md) | docs | The Errors page the perps docs link to has no perp, MarginBank or perp-stop errors (9 of 9 observed are missing) |
| [NORMAL-25](feedback/NORMAL-25-sdk-fetch-trades-ohlcv-ignore-since.md) | SDK | `fetchTrades` / `fetchOHLCV` return the newest rows instead of starting at `since`; history can't be paged |

## Investigated and ruled out

These were checked specifically for critical or major impact and are **not** filed, because the evidence didn't support a defect. They're listed so reviewers can see the coverage and avoid duplicate work.

| Area | What was checked | Result |
|---|---|---|
| Liquidations | Health of all 7,142 position holders across 21 markets (`getAccountHealth`) | 7,008 Healthy, 134 MarginCall, **0 below maintenance**. Liquidations are keeping up; the engine has a registered bidder. |
| Solvency plumbing | `getPerpSystemConfig`, `getInsuranceFundState`, `getLiquidationEngineConfig` | `fullyWired: true`; insurance fund 525,000 USDso across tiers 1–3; penalty 100 bps. |
| Mark feeds | `getPerpFeedStatus` on all 21 markets | All `markPriceOk: true`, index updated within seconds. |
| Open interest caps | Live OI against on-chain `maxOpenInterest` | All within cap (highest BTC at 58%). Only the **docs** are wrong (NORMAL-10). |
| Account analytics | `listPerpPositionAnalytics` contributions + unlocked collateral against `getAccountHealth().equity` | Matches to the wei (or 1 wei of rounding) on every sampled account. |
| Margin-limited max size | `getMaxPerpOrderSize` with `limitedBy: "initialMargin"`, simulated at `asOfBlock` | Exact. Early mismatches were mark drift between blocks and vanished when pinned. |
| Wrong-side stop pair | Whether the registry would arm a reduce-only bracket on the wrong side (a silent loss of protection) | The registry rejects it (`NoReducingPositionAtCreation`), so protection is never silently fake. Filed at major as MAJOR-04 for the bot behaviour around it. |
| Trading-key value extraction | Whether a linked bot key could trade the owner against an attacker at extreme prices | Placement has no price band, but fills are bounded by `FillPriceOutsideBand` (fills about 8% from mark rejected). Exposure is limited to what any trade-permission key has. Not filed. |
| Docs data | Base-decimals table, ticks, minimum sizes, leverage and margin rates | All match the chain exactly. |
| Indexer open orders | Order IDs from `fetchOpenOrders` against the pool's own book, read at the same moment, 4 rounds | Identical every round (11/11, 19/19, 20/20, 20/20). No stale or missing orders. |
| Withdrawal enforcement | `MarginBank.withdraw` binary-searched at pinned blocks on 10 accounts (ordinary and paper-USDso) | Never allowed more than margin and the credit floor permit. Only the **view** is wrong (MAJOR-18). |
| Paper-USDso claims | `VoucherDistributor` eligibility for credited accounts | Enforced once per address (`isClaimed`); larger credit floors come from the weekly Arena credit. |
| Funding direction in the bot kit | `perp-funding` side selection against the rate's sign | Correct: positive funding ⇒ hold the short. Only the **docs** rule is wrong (NORMAL-23). |
| Candles vs trades | 1-minute candles rebuilt from raw fills for ETH and SOL (38 and 35 buckets) | Open, high, low, close and volume match exactly. |
| Error selectors | All 58 selectors on the Errors page recomputed with keccak256 | All correct. Only coverage is missing (NORMAL-24). |
| Margin thresholds and fees | Close-out = ½ maintenance, funding window/interval, stop deposit, liquidation penalty on all 21 markets | All match the docs (close-out ½ MM, 8 h / 1 h, 0.15 STT, 100 bps). |
| Unified market data | `fetchTicker`, `fetchOrderBook`, `fetchTrades`, `fetchOHLCV`, `fetchFundingRate` on BTC | Consistent with each other and the chain. |

## Observations not filed

| Observation | Why it isn't filed |
|---|---|
| [`fetchOpenOrders` intermittently failed with `PerpPortfolio … database query error`](observations/indexer-open-orders-timeout.md) for two high-activity accounts (6/6 and 5/6 failures in the first two runs) | The failure rate fell to 0/8 for both accounts by the final run. It can't be reproduced on demand, so it doesn't meet the bounty's acceptance rule. History and script are kept in `observations/` in case server logs for that window are useful. |

## Reproducing the findings

Requirements: Node 20+ and internet access to the Hideki RPC and indexer. No wallet, key or testnet funds are needed.

```bash
git clone https://github.com/rohan911438/DreamDex-Findings
cd DreamDex-Findings/repro
npm install

# one finding
npx tsx 01-max-size-ignores-resting-orders.ts

# every finding, writing stamped logs to ../evidence/
node run-all.mjs

# refresh the cited source excerpts in ../evidence/code/
node extract-code.mjs
```

| Finding | Script |
|---|---|
| MAJOR-01 … MAJOR-06, MAJOR-18 | `repro/01-*.ts` … `repro/06-*.ts`, `repro/18-*.ts` |
| NORMAL-07 … NORMAL-16, NORMAL-19 … NORMAL-25 | `repro/<NN>-*.ts` |
| NORMAL-17 | source excerpts: `evidence/code/17-*` |

**Live-state note.** MAJOR-01, MAJOR-04, MAJOR-18, NORMAL-19 and NORMAL-20 depend on accounts that are actively trading (a market maker with resting quotes near its position cap, a short holder that has used stops, accounts holding positions or paper USDso). Both scripts accept an account argument, and MAJOR-04 searches for a suitable account by itself. The block numbers in each log show the exact state the evidence came from.

## Repository layout

```
feedback/        one Markdown file per finding, in the bounty template, prefixed MAJOR- / NORMAL-
evidence/        <NN>-<name>.log: output of repro/<NN>-<name>.ts with a header
                 (UTC time, chain id, head block range, RPC, indexer, SDK/viem/node versions)
evidence/code/   exact source lines each finding cites, with line numbers and permanent links;
                 app excerpts (06-app-*, 19-app-*) are verbatim from the public bundle, with chunk URL and SHA-256
observations/    items investigated but not filed (with their history and scripts)
repro/           read-only reproduction scripts (TypeScript, run with tsx), numbered to match findings
  lib.ts         shared client, eth_call simulator, revert decoder, on-chain book reader
  run-all.mjs    runs every script and writes the stamped evidence logs
  extract-code.mjs  regenerates evidence/code/
```

## Versions and endpoints

| Item | Value |
|---|---|
| Network | Somnia Tokyo testnet, Hideki, chain id `50383` (the app's DreamDEX region) |
| RPC | `https://api.hideki2.infra.testnet.somnia.network` |
| Indexer | `https://hideki-dev.smk.somnia.host/v1/graphql` |
| SDK | `@somnia-chain/markets-sdk@0.32.1`, `viem@2.x` |
| Bot kit | `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4` |
| MarginBank | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` |
| Perps collateral (USDso) | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` |
| Testing window | 2026-10-20 (UTC) |

## Disclosure

Per the bounty rules, any security vulnerability would be sent privately to `security@dreamdex.io` and kept out of this repository. No finding here is a security vulnerability. Accounts named in reports and logs are public testnet addresses read from on-chain state; no private data is included.

---

Submitted by [@rohan911438](https://github.com/rohan911438) for the dreamDEX Perps Builder Bounty, Track 1 (Feedback).
