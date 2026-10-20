# NORMAL-10 · Market table's open interest caps are wrong on 20 of 21 markets; the "a tenth per account" rule holds on 1
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | `/docs/trading/perps-testnet` → "Markets" table and notes; `/docs/developers/perps-testnet` → "Common pitfalls" |
| **Affects** | Traders and developers sizing against published caps |
| **Reproduce** | `npx tsx repro/10-oi-caps-vs-docs.ts` (read-only) |
| **Evidence** | [`evidence/10-oi-caps-vs-docs.log`](../evidence/10-oi-caps-vs-docs.log) |

## Summary

The traders' page says the figures in its market table "are read from the live markets". The **Open interest cap** column doesn't match on-chain `maxOpenInterest` on **20 of 21** markets. The live caps are exactly **2×** (BTC, ETH, SOL, HYPE) or **4×** (16 others) the documented values; only TAO matches. Read naively, the table says BTC (about 286 BTC open) and XRP (about 610k open) are already over their caps.

Both pages also state *"A single account is capped at a tenth of it on most markets"* (developer page: *"a tenth of the market's open interest cap on most markets"*). On chain, `maxPositionSize / maxOpenInterest` is 10% on **one** market (TAO). It's 5% on 12 markets, 2.5% on 6, 20.3% on BTC and 25% on ZEC.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 10-oi-caps-vs-docs.ts`. The documented caps are copied into the script and compared with `client.getPerpRiskParams(pool)` for every market.

## Expected

The table matches the live parameters (ideally generated from them), and the per-account cap is described as it is (or the table gains a "Max position per account" column).

## Actual (excerpt)

| Market | Docs OI cap | On-chain `maxOpenInterest` | Chain / docs | `maxPositionSize` | Per-account share |
|---|---|---|---|---|---|
| BTC | 246.81545 | 493.6309 | 2.00 | 100 | 20.3% |
| ETH | 3,995.6125 | 7,991.225 | 2.00 | 399.5612 | 5.0% |
| XRP | 344,632 | 1,378,528 | 4.00 | 68,926.4 | 5.0% |
| ZEC | 420 | 1,680 | 4.00 | 420 | 25.0% |
| ZRO | 250,599.5 | 1,002,398 | 4.00 | 25,059.9 | 2.5% |
| TAO | 2,185.491 | 2,185.491 | 1.00 | 218.549 | 10.0% |

```
20 of 21 markets: docs OI cap != on-chain maxOpenInterest
1 of 21 markets: per-account cap is exactly a tenth of the OI cap
```

The rest of the same table (max leverage, initial/maintenance margin, price tick, minimum size) **does** match the chain, and so does the developer page's base-decimals table.

## Evidence

- Log with all 21 markets: [`evidence/10-oi-caps-vs-docs.log`](../evidence/10-oi-caps-vs-docs.log)

## Impact

Developers who size against the documented per-account cap (as the pitfall suggests) get the limit wrong by 2-4×, in both directions depending on the market. Traders misread market capacity.

## Suggested fix

Regenerate the table from `getPerpRiskParams` (or render it live), add a per-account cap column, and replace "a tenth … on most markets" with "set per market; read `maxPositionSize` (or `getMaxPerpOrderSize().maxPositionSize`)".

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, no wallet.
