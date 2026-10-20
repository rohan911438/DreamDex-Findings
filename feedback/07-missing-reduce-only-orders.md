# No reduce-only flag for regular perp orders; a "close" can open the opposite position
Severity: major
Area: contracts

Missing feature. Only stop orders can be reduce-only. A regular perp order has no reduce-only option at any layer:

- `PerpPool.placeOrder(isBid, userData, price, quantity, expireTimestampNs, orderType, selfMatchingOption, builder, builderFeeBpsTimes1k)` has no such input;
- `trader.placePerpOrder` has none;
- the unified `createOrder` has no `reduceOnly` param, and a ccxt-style `{ reduceOnly: true }` is accepted and silently ignored.

So every "close" is an ordinary order sized from a read taken moments earlier. The bot kit's `closePosition` (`packages/perp-core/src/orders.ts:234-298`) reads `previewPerpClosePnl().closedQuantity`, then `fetchPositions()`, then the book, then sends a MARKET order for the earlier quantity. If the position shrinks in between (a stop fires, a resting reducing order fills, a liquidation or ADL takes part of it), the extra quantity opens a position in the opposite direction. `perp-guard` relies on this path to de-risk accounts in trouble, when such races are most likely.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 12-no-reduce-only-order.ts` prints the `placeOrder` inputs (no reduce-only field) and `ORDER_TYPE` (`LIMIT`, `FILL_OR_KILL`, `MARKET`, `POST_ONLY`).
2. Race reproduction on testnet: hold 0.01 ETH long with a resting reduce (sell) limit for 0.005 ETH just under the touch. Call the kit's `closePosition()` and let the resting sell fill between its preview read and its MARKET order.

## Expected
A close/reduce order can be marked reduce-only, so the pool clamps it to the live position and never flips it. The unified API supports `params.reduceOnly` (the ccxt convention) or rejects unknown params.

## Actual
No reduce-only option. Close orders are sized off a stale read, and `{ reduceOnly: true }` in `createOrder` params is dropped without an error.

## Impact
Bots can't close safely. Every perps venue exposes reduce-only (and ccxt standardizes `reduceOnly`) because this race is common, especially during the volatile moments when bots de-risk.

## Suggested fix
Add a reduce-only flag (or order type) to `PerpPool.placeOrder` that the pool clamps against `_reducingCapacity`. Expose it in `placePerpOrder` and as `params.reduceOnly` in `createOrder`.

## Evidence
- `evidence/12-no-reduce-only-order.txt`
- Code: `dreamdex-bot-kit/packages/perp-core/src/orders.ts:234-298`; SDK `dist/unified/exchange.d.ts` `CreateOrderParams` (no `reduceOnly`)

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`, dreamdex-bot-kit `2579866`. Network: Somnia Tokyo testnet (Hideki, chain 50383).
