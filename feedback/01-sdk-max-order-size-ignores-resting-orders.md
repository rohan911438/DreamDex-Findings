# getMaxPerpOrderSize ignores resting same-side orders, so an order at "max" reverts MaxPositionSizeExceeded
Severity: major
Area: SDK

`client.getMaxPerpOrderSize` is documented as "what a **Max** button should call" and as unable to disagree with the pool ("Never the reverse, which is what would revert"). When the binding gate is the per-account position cap (`limitedBy: "maxPositionSize"`), it models the cap as `|position ± quantity| <= maxPositionSize` and leaves out the account's own resting orders on the same side. The pool counts them. The SDK's max is therefore too large by exactly the resting quantity, and placing it reverts.

Source: `dist/perp/margin.js:1446-1449` (`withinPositionCap`) in `@somnia-chain/markets-sdk@0.32.1`.

## Steps to reproduce
1. `cd repro && npm install`
2. `npx tsx 01-max-size-ignores-resting-orders.ts`
   (defaults to `0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF`, a live market maker with large positions and resting quotes; pass any account as `argv[2]`)
3. For each market and side where `limitedBy === "maxPositionSize"`, the script:
   - reads `getMaxPerpOrderSize` at a resting price 5% from the mark,
   - reads the account's resting same-side orders from the pool (`getAllOpenOrdersOffChain`) **at `max.asOfBlock`**,
   - `eth_call`s `placeOrder(quantity = maxQuantity)` at `max.asOfBlock`,
   - `eth_call`s `placeOrder(quantity = maxQuantity - resting)` at the same block.

## Expected
`placeOrder(maxQuantity)` succeeds. That's the contract of the method.

## Actual
It reverts `MaxPositionSizeExceeded()` on 11 market-sides (BTC, ETH, SOL, XRP, NEAR, DOGE; bids and asks). Subtracting the resting same-side quantity makes the order succeed on every one of them. Excerpt (full log in `evidence/01-max-size.txt`):

```
ETH ASK @ block 28488827
  position -126.038  maxPositionSize 399.5612
  resting asks of this account: 5 orders, 41.7574 ETH
  SDK getMaxPerpOrderSize.maxQuantity = 273.5232 (limitedBy maxPositionSize, placeable true)
  eth_call placeOrder(qty = SDK max)              -> MaxPositionSizeExceeded()
  eth_call placeOrder(qty = SDK max - resting)    -> OK
```

Every simulation is pinned to the block the SDK itself read (`asOfBlock`), so mark movement can't explain the gap. Margin-limited cases (`limitedBy: "initialMargin"`) were checked the same way and **do** match the pool exactly. Only the position-cap gate is wrong.

## Impact
Market makers and large traders are exactly the accounts that rest orders near the cap. A Max button or a bot that sizes with this method sends orders that revert and burn gas. The bot kit's `sizeOrder` (`packages/perp-core/src/orders.ts`) relies on this method for every perp strategy.

## Suggested fix
Include the account's resting increasing quantity on the order's side (the pool already exposes it) in `withinPositionCap`, or read the pool's own position-cap headroom.

## Evidence
- `evidence/01-max-size.txt` (11 reproductions, block numbers included)
- Code: `node_modules/@somnia-chain/markets-sdk/dist/perp/margin.js:1446-1457`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`, viem 2.x, Node 24. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only (eth_call), no wallet needed. Account under test: `0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF` (public testnet account).
