# MAJOR-02 · Unified `createOrder` sends perp orders below `minQuantity`, which revert on chain with `QuantityBelowMinimum`
Severity: major
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified exchange, `createOrder` |
| **Affects** | Every perp market (21 of 21); any caller of `exchange.createOrder` on a `…/USDso:USDso` symbol |
| **Reproduce** | `npx tsx repro/02-create-order-below-min-quantity.ts` (read-only) |
| **Evidence** | [`evidence/02-create-order-below-min-quantity.log`](../evidence/02-create-order-below-min-quantity.log), [`evidence/code/02-sdk-dist_unified_exchange_js.txt`](../evidence/code/02-sdk-dist_unified_exchange_js.txt) |

## Summary

`createOrder` snaps the amount down to the lot grid and refuses it only when the result is zero, i.e. below one lot. The code justifies this with an invariant that doesn't hold for perps:

> One lot is also the venue's `minQuantity`: every deployed venue sets tick = lot = min … so this threshold is exactly the venue's own and there is no band where an order passes here and still reverts as below-minimum.
> (`dist/unified/exchange.js`, lines 4375-4379)

On every perp market `minQuantity` is between **9 and 69 lots**. Any amount in `[lot, minQuantity)` passes the SDK, is signed and mined, and reverts in the pool with `QuantityBelowMinimum(quantity, minimum)`. Perp writes aren't pre-simulated, so the failure costs gas. The correct minimum is already loaded (`market.limits.amount.min`) but not checked.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 02-create-order-below-min-quantity.ts`
3. The script:
   - prints `lotSize`, `minQuantity` and lots-per-minimum for all 21 perp markets (from `client.listPerpMarkets()`);
   - shows that the SDK's own sizing helper accepts 0.0001 BTC (10 lots) without complaint;
   - `eth_call`s `PerpPool.placeOrder` from a funded public account for 0.0001 BTC and for 0.00013 BTC, as a resting bid 10% under the mark.

## Expected

`exchange.createOrder("BTC/USDso:USDso", "limit", "buy", 0.0001, price)` throws `InvalidInputError` locally, as it already does below one lot, because 0.0001 < `limits.amount.min` (0.00013).

## Actual

The SDK guard passes, and the same order reverts on chain:

```
BTC/USDso:USDso unified limits.amount.min = 0.00013
ex.amountToPrecision("BTC/USDso:USDso", 0.0001) = 0.0001  (accepted, no error)
eth_call placeOrder BTC bid 0.0001 BTC  from 0x6328…3179 -> QuantityBelowMinimum(10000,13000)
eth_call placeOrder BTC bid 0.00013 BTC from 0x6328…3179 -> OK
```

The gap exists on every market:

| Market | lot | minQuantity | lots per minimum |
|---|---|---|---|
| XRP | 0.1 | 6.9 | 69 |
| XLM | 1 | 54 | 54 |
| ZRO / NEAR | 0.1 | 5.1 | 51 |
| ADA | 1 | 46 | 46 |
| ETH | 0.0001 | 0.004 | 40 |
| BTC | 0.00001 | 0.00013 | 13 |
| ZEC / LINK | — | — | 9 (smallest gap) |

(Full table for all 21 markets in the evidence log.)

## Evidence

- Log: [`evidence/02-create-order-below-min-quantity.log`](../evidence/02-create-order-below-min-quantity.log)
- Source: [`evidence/code/02-sdk-dist_unified_exchange_js.txt`](../evidence/code/02-sdk-dist_unified_exchange_js.txt) (lines 4362-4384: lot alignment, the `quantity <= 0n` guard and the comment stating the invariant)

## Impact

- Bots that size from a USD notional (the bot kit's `PERP_NOTIONAL_USDSO`, any "trade $5" strategy) regularly produce amounts just under the minimum on small notionals. Each one becomes a mined, failed transaction instead of a clear local error.
- The code comment tells maintainers this case can't happen, which makes it hard to find.

## Root cause

The minimum-size guard was written for spot and binary venues, where tick = lot = min. Perp pools set `minQuantity` independently of `lotSize`, and the shared `createOrder` path doesn't branch on that.

## Suggested fix

After lot alignment, reject `quantity < minQuantity` (raw `info.minQuantity`, or `limits.amount.min`) with an `InvalidInputError` that names the market minimum. Correct the comment to say the invariant holds for spot and binary only.

## Environment

- SDK: `@somnia-chain/markets-sdk` 0.32.1, viem 2.x, Node 24
- Network: Somnia Tokyo testnet (Hideki, chain 50383); RPC `https://api.hideki2.infra.testnet.somnia.network`
- Wallet: none. Read-only `eth_call` from public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`
- Block range and timestamp: see the evidence log header
