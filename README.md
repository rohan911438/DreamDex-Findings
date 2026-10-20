# DreamDex-Findings

Feedback-track submission for the **dreamDEX Perps Builder Bounty** (DoraHacks, Track 1: Feedback).

18 reproducible items covering the perps SDK (`@somnia-chain/markets-sdk@0.32.1`), the indexer API, the developer and trader docs, and the official [dreamdex-bot-kit](https://github.com/somnia-chain/dreamdex-bot-kit) perp strategies, all tested on the **Somnia Tokyo testnet (Hideki, chain 50383)**.

Each item is one Markdown file in [`feedback/`](feedback) and follows the bounty template. Most have a script in [`repro/`](repro) and saved output in [`evidence/`](evidence).

## Summary

| # | Severity | Area | Title |
|---|---|---|---|
| 01 | major | SDK | [getMaxPerpOrderSize ignores resting same-side orders, so an order at "max" reverts MaxPositionSizeExceeded](feedback/01-sdk-max-order-size-ignores-resting-orders.md) |
| 02 | major | API | [fetchOpenOrders on perps fails with "PerpPortfolio … database query error" for high-activity accounts](feedback/02-api-fetch-open-orders-indexer-timeout.md) |
| 03 | major | SDK | [Unified createOrder sends perp orders below minQuantity; they revert on chain](feedback/03-sdk-create-order-below-min-quantity.md) |
| 04 | major | SDK | [Bot kit uses the Shannon address set on Hideki: status discovery fails silently, halted markets look tradeable](feedback/04-botkit-shannon-addresses-on-hideki.md) |
| 05 | major | SDK | [perp-starter "manages" an existing position but builds its TP/SL from PERP_SIDE](feedback/05-botkit-perp-starter-wrong-side-bracket.md) |
| 06 | major | SDK | [perp-maker forgets quotes whose cancel failed and crashes outside its cleanup path](feedback/06-botkit-perp-maker-loses-live-quotes.md) |
| 07 | major | contracts | [No reduce-only flag for regular perp orders; a "close" can open the opposite position](feedback/07-missing-reduce-only-orders.md) |
| 08 | normal | SDK | [precision.amount is 0 for perps whose lot is 10 or 100](feedback/08-sdk-unified-amount-precision-wrong-for-large-lots.md) |
| 09 | normal | SDK | [perpPoolWriteAbi lacks placeOrderFor / placeOrdersFor / cancelOrderFor](feedback/09-sdk-perp-write-abi-missing-operator-functions.md) |
| 10 | normal | docs | [Raw placeOrderFor docs don't say what expireTimestampNs to pass; 0 reverts](feedback/10-docs-raw-order-expiry-undocumented.md) |
| 11 | normal | docs | [Open interest caps wrong on 20 of 21 markets; "a tenth per account" holds on 1](feedback/11-docs-oi-cap-table-stale.md) |
| 12 | normal | docs | [SDK's bundled PERPS.md says only BTC and ETH perps exist, with symbols that don't resolve](feedback/12-docs-sdk-perps-guide-stale.md) |
| 13 | normal | SDK | [fetchPortfolioAnalytics("1d") fails with a NaN message](feedback/13-sdk-portfolio-timeframe-error.md) |
| 14 | normal | SDK | [fetchBalance leaves out the Perps account](feedback/14-sdk-fetch-balance-omits-perps-margin.md) |
| 15 | normal | SDK | [Bot kit pins markets-sdk ^0.31.0, which can't resolve to the documented 0.32.1](feedback/15-botkit-sdk-version-pinned-below-documented.md) |
| 16 | normal | SDK | [loadMarkets fails open: perps stay active: true when status discovery fails](feedback/16-sdk-load-markets-fails-open-on-discovery-error.md) |
| 17 | normal | docs | [The perps network has three names and no page says they're the same](feedback/17-docs-network-has-three-names.md) |
| 18 | normal | SDK | [Bot kit labels the testnet stop deposit "SOMI" instead of STT](feedback/18-botkit-stop-deposit-labelled-somi.md) |

## Running the reproductions

Every script is **read-only**. It uses chain reads, indexer reads and `eth_call` simulations; nothing is signed or broadcast, and no private key is needed. Accounts referenced are public testnet accounts.

```bash
cd repro
npm install
npx tsx 01-max-size-ignores-resting-orders.ts
npx tsx 02-fetch-open-orders-fails-for-makers.ts
# … see repro/package.json for the full list
```

Requires Node 20+. Items 01, 02 and 05 depend on live account state (a market maker's resting orders, a short holder with stops). The scripts take an account argument and 05 searches for a suitable account automatically. The saved output in `evidence/` records the block numbers they ran at.

## Versions

- `@somnia-chain/markets-sdk` 0.32.1 (the version the dreamDEX developer docs name)
- `somnia-chain/dreamdex-bot-kit` `main` @ `2579866`
- RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Tested 2026-10-20
