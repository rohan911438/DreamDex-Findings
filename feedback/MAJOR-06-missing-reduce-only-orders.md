# MAJOR-06 · No reduce-only flag for regular perp orders; a "close" can open the opposite position
Severity: major
Area: contracts

| | |
|---|---|
| **Component** | `PerpPool.placeOrder`; SDK `trader.placePerpOrder` and unified `createOrder`; bot kit `closePosition` |
| **Type** | Missing feature with a safety impact |
| **Reproduce** | `npx tsx repro/06-no-reduce-only-order.ts` (read-only) |
| **Evidence** | [`evidence/06-no-reduce-only-order.log`](../evidence/06-no-reduce-only-order.log), [`evidence/code/06-kit-packages_perp-core_src_orders_ts.txt`](../evidence/code/06-kit-packages_perp-core_src_orders_ts.txt) |

## Summary

Only **stop** orders can be reduce-only. A regular perp order has no reduce-only option at any layer:

| Layer | Reduce-only available? |
|---|---|
| `PerpPool.placeOrder(isBid, userData, price, quantity, expireTimestampNs, orderType, selfMatchingOption, builder, builderFeeBpsTimes1k)` | No input for it; `ORDER_TYPE` is `LIMIT`, `FILL_OR_KILL`, `MARKET`, `POST_ONLY` |
| SDK `trader.placePerpOrder` | No |
| SDK unified `createOrder(…, params)` | No `reduceOnly` in `CreateOrderParams`; a ccxt-style `{ reduceOnly: true }` is **silently ignored** |

So every close is an ordinary order sized from a read taken moments earlier. The bot kit's `closePosition` (used by `perp-starter`'s exits and by `perp-guard` to de-risk) reads `previewPerpClosePnl().closedQuantity`, then `fetchPositions()`, then the order book, and only then sends a MARKET order for the earlier quantity. If the position shrinks in between (a stop fires, a resting reduce order fills, a liquidation or ADL takes part of it), the surplus **opens a new position in the opposite direction**.

## Steps to reproduce

1. `cd repro && npm install && npx tsx 06-no-reduce-only-order.ts`. This prints the `placeOrder` inputs and the order types: no reduce-only field exists.
2. Race on testnet (funds needed):
   1. Hold 0.01 ETH long on ETH-PERP and rest a sell limit for 0.005 ETH just above the best bid.
   2. Call the kit's `closePosition(ctx, market, account)`.
   3. Let the resting sell fill between `closePosition`'s preview read and its MARKET order (for example by crossing it from a second account).
   4. The MARKET sell for 0.01 ETH leaves the account **short 0.005 ETH**.

## Expected

A close or reduce order can be marked reduce-only, so the pool clamps it to the live position at execution and never flips it. The unified layer supports `params.reduceOnly` (the ccxt convention) or rejects unknown params instead of dropping them.

## Actual

```
PerpPool.placeOrder inputs: bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k
has a reduce-only input: NO
ORDER_TYPE values: {"LIMIT":0,"FILL_OR_KILL":1,"MARKET":2,"POST_ONLY":3}
```

## Evidence

- Log: [`evidence/06-no-reduce-only-order.log`](../evidence/06-no-reduce-only-order.log)
- **App:** the testnet app's order-type table hard-codes `reduceOnly: !1` (false) for `market` and `limit`; only `stop-market`, `stop-limit` and the take-profit types are `reduceOnly: !0`. Verbatim excerpt with chunk URL and SHA-256: [`evidence/code/06-app-order-type-table.txt`](../evidence/code/06-app-order-type-table.txt)
- **Docs:** the trader Orders page (`/docs/trading/perps-testnet/orders`) nonetheless states, right after the order-type table, *"Reduce-only orders can only shrink a position, never open or flip one."* No regular order type in the contract, SDK or app provides that guarantee
- Source: [`perp-core/src/orders.ts` L234-298](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/orders.ts#L234-L298) (`closePosition`: preview, then position, then book, then MARKET order), excerpted in `evidence/code/06-*`
- SDK typings: `dist/unified/exchange.d.ts`, `interface CreateOrderParams` (`timeInForce`, `postOnly`, `slippage`, `builder`, `builderFeeBpsTimes1k`, `collateral…`; no `reduceOnly`)

## Impact

Bots can't close safely. The race is most likely when de-risking matters most: fast markets, stops firing, liquidations in progress. That's exactly when `perp-guard` acts. Every major perps venue, and ccxt's unified API, offers reduce-only for this reason.

## Root cause

The perp order path reuses the generic order-book `placeOrder` interface, which has no notion of position. Position-aware clamping exists only in the stop-order registry (`_reducingCapacity`).

## Suggested fix

Add a reduce-only flag (or order type) to `PerpPool.placeOrder` / `placeOrderFor` that clamps the fill to the reducing capacity at match time. Expose it as `reduceOnly` in `placePerpOrder` and `params.reduceOnly` in `createOrder`. Until then, have `createOrder` reject unknown params rather than ignore them.

## Environment

- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Bot kit: `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4`
- Network: Somnia Tokyo testnet (Hideki, chain 50383)
- Wallet: none for step 1; funded testnet accounts for step 2
