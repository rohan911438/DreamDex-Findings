# MAJOR-01 · `getMaxPerpOrderSize` ignores the account's resting same-side orders, so an order at "max" reverts `MaxPositionSizeExceeded`
Severity: major
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, `client.getMaxPerpOrderSize` (`dist/perp/margin.js`) |
| **Affects** | Any account with resting orders whose size is bound by the per-account position cap (`limitedBy: "maxPositionSize"`). In practice: market makers and large traders. Used by every bot-kit perp strategy via `sizeOrder` |
| **Reproduce** | `npx tsx repro/01-max-size-ignores-resting-orders.ts` (read-only) |
| **Evidence** | [`evidence/01-max-size-ignores-resting-orders.log`](../evidence/01-max-size-ignores-resting-orders.log) (11 reproductions), [`evidence/code/01-sdk-dist_perp_margin_js.txt`](../evidence/code/01-sdk-dist_perp_margin_js.txt) |

## Summary

`getMaxPerpOrderSize` is documented as "what a **Max** button should call", computed by searching the pool's own forward rule "so the two cannot disagree". Its source states the guarantee:

> … the answer is a legal size that UNDER-states what the chain would take. Never the reverse, which is what would revert.
> (`dist/perp/margin.js`, line 1457)

For the per-account position cap, the SDK models the pool check (`_enforceMaxPositionSize`) as:

```js
const withinPositionCap = (q) => {
    const newAbs = abs(positionSize + (p.isBid ? q : -q));
    return newAbs <= params.maxPositionSize || newAbs <= absPosition;
};
```

It leaves out the account's **own resting orders on the same side**, which the pool counts. When the position cap binds, the returned `maxQuantity` is too large by exactly that resting quantity, and placing it reverts.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 01-max-size-ignores-resting-orders.ts [account] [markets]`
   - The default account is `0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF`, a public testnet market maker with large positions and resting quotes on several markets.
3. For every market and side where `limitedBy === "maxPositionSize"`, the script:
   1. calls `getMaxPerpOrderSize` for a resting price 5% from the mark (so only placement gates apply);
   2. reads the account's resting orders on that side from the pool itself (`getAllOpenOrdersOffChain`) **at `max.asOfBlock`**, the block the SDK read;
   3. `eth_call`s `PerpPool.placeOrder(quantity = maxQuantity)` from the account at `max.asOfBlock`;
   4. `eth_call`s `placeOrder(quantity = maxQuantity − restingSameSide)` at the same block.

Because steps 2-4 are pinned to the SDK's own block, price or position changes between reads can't explain the result.

## Expected

`placeOrder(maxQuantity)` succeeds. That's the method's contract and the stated guarantee.

## Actual

Reproduced on **11 market-sides** (BTC, ETH, SOL, XRP, NEAR, DOGE; bids and asks). In every case the SDK's max reverts, and the max minus the resting same-side quantity succeeds:

```
BTC ASK @ block 28504451
  position -74.55125  maxPositionSize 100
  resting asks of this account: 10 orders, 1.22905 BTC
  SDK getMaxPerpOrderSize.maxQuantity = 25.44875 (limitedBy maxPositionSize, placeable true)
  eth_call placeOrder(qty = SDK max)              -> MaxPositionSizeExceeded()
  eth_call placeOrder(qty = SDK max - resting)    -> OK

ETH ASK @ block 28504489
  position -134.2349  maxPositionSize 399.5612
  resting asks of this account: 5 orders, 41.8041 ETH
  SDK getMaxPerpOrderSize.maxQuantity = 265.3263 (limitedBy maxPositionSize, placeable true)
  eth_call placeOrder(qty = SDK max)              -> MaxPositionSizeExceeded()
  eth_call placeOrder(qty = SDK max - resting)    -> OK
```

**Control.** A margin-limited case (`limitedBy: "initialMargin"`; account `0x9a149509770E9FAd526907e7C93148CA74001A89`, XRP bid, no resting orders), checked the same way at `asOfBlock`, matched the pool exactly: the largest accepted size equalled `maxQuantity`, and one lot more reverted `InsufficientMarginForOrder`. The defect is specific to the position-cap gate.

## Evidence

- Log with all 11 reproductions and block numbers: [`evidence/01-max-size-ignores-resting-orders.log`](../evidence/01-max-size-ignores-resting-orders.log)
- Source: [`evidence/code/01-sdk-dist_perp_margin_js.txt`](../evidence/code/01-sdk-dist_perp_margin_js.txt) (lines 1440-1460: `withinPositionCap` and the "never the reverse" guarantee)

## Impact

- A "Max" button built on this method produces orders that revert for exactly the users most likely to press it: market makers and large accounts near their cap.
- Bots that size with it (the bot kit's `sizeOrder` in `packages/perp-core/src/orders.ts` is used by all perp strategies) send transactions that revert and burn gas.
- The documented guarantee ("never the reverse") is what integrators rely on to skip their own checks.

## Root cause

`withinPositionCap` evaluates `|position ± q|` only, while the pool's position-cap check also counts the account's resting orders that would increase the position on that side.

## Suggested fix

Include the account's resting same-side (increasing) quantity in `withinPositionCap`, which the SDK can read from the pool, or read the pool's position-cap headroom directly if it exposes one. Add a regression test with resting orders near the cap.

## Environment

- SDK: `@somnia-chain/markets-sdk` 0.32.1, viem 2.57.7, Node 24
- Network: Somnia Tokyo testnet (Hideki, chain 50383); RPC `https://api.hideki2.infra.testnet.somnia.network`
- Account under test: `0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF` (public testnet account; state as of the blocks in the log)
- Wallet: none; read-only `eth_call` pinned to the SDK's `asOfBlock`
