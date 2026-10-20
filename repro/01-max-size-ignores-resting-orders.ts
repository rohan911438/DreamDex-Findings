// getMaxPerpOrderSize ignores the account's resting same-side orders when it
// applies the per-account position cap (limitedBy: "maxPositionSize").
//
// For each market, both sides: read the SDK's max, then eth_call placeOrder at
// that size AT THE BLOCK THE SDK READ (max.asOfBlock), and again at
// (max - the account's resting same-side quantity).
//
// Usage: npx tsx 01-max-size-ignores-resting-orders.ts [account] [BTC,ETH,SOL,...]
import type { Address } from "viem";
import { exchange, perpMarket, simulatePlaceOrder, restingOrders, human, done } from "./lib.js";

const account = (process.argv[2] ?? "0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF") as Address;
const bases = (process.argv[3] ?? "BTC,ETH,SOL,XRP,NEAR,DOGE").split(",");
const ex = exchange();
const c = ex.client as any;

console.log(`account ${account}`);
let reproduced = 0;
for (const base of bases) {
  const m = await perpMarket(ex, base);
  const snap = await c.getPerpHealthSnapshot(m.poolAddress);
  if (!snap.priceable) continue;
  const tick = BigInt(m.tickSize);
  const lot = BigInt(m.lotSize);
  for (const isBid of [true, false]) {
    // A passive price 5% away from the mark: the order rests, so only the
    // placement gates (margin, position cap) decide.
    const price = isBid
      ? ((snap.markPrice * 95n) / 100n / tick) * tick
      : (((snap.markPrice * 105n) / 100n + tick - 1n) / tick) * tick;
    const max = await c.getMaxPerpOrderSize({ pool: m.poolAddress, marginBank: m.marginBank, account, isBid, price });
    if (!max.priceable || !max.placeable || max.limitedBy !== "maxPositionSize") continue;
    const block: bigint = max.asOfBlock;
    const resting = await restingOrders(m.poolAddress, account, isBid, block);
    const restingQty = resting.reduce((s, o) => s + o.remaining, 0n);
    if (restingQty === 0n) continue;

    const atMax = await simulatePlaceOrder({ from: account, pool: m.poolAddress, isBid, price, quantity: max.maxQuantity, blockNumber: block });
    const adjusted = ((max.maxQuantity - restingQty) / lot) * lot;
    const atAdjusted = await simulatePlaceOrder({ from: account, pool: m.poolAddress, isBid, price, quantity: adjusted, blockNumber: block });
    const d = m.baseDecimals;
    console.log(
      `\n${base} ${isBid ? "BID" : "ASK"} @ block ${block}\n` +
        `  position ${human(max.positionSize, d)}  maxPositionSize ${human(max.maxPositionSize, d)}\n` +
        `  resting ${isBid ? "bids" : "asks"} of this account: ${resting.length} orders, ${human(restingQty, d)} ${base}\n` +
        `  SDK getMaxPerpOrderSize.maxQuantity = ${human(max.maxQuantity, d)} (limitedBy ${max.limitedBy}, placeable ${max.placeable})\n` +
        `  eth_call placeOrder(qty = SDK max)              -> ${atMax}\n` +
        `  eth_call placeOrder(qty = SDK max - resting)    -> ${atAdjusted}`,
    );
    if (atMax !== "OK" && atAdjusted === "OK") reproduced++;
  }
}
console.log(`\nreproduced on ${reproduced} market-side(s)`);
await done(ex);
