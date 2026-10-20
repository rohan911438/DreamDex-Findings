// The unified createOrder guards only "amount >= one lot". On every perp market
// minQuantity is several lots, so amounts in [lot, minQuantity) pass the SDK and
// the pool reverts QuantityBelowMinimum on chain.
//
// Part 1 prints lot vs minQuantity for all 21 perp markets.
// Part 2 shows the SDK's own helpers accept such an amount.
// Part 3 eth_calls placeOrder for that amount from a funded account.
//
// Usage: npx tsx 03-create-order-below-min-quantity.ts [fundedAccount]
import type { Address } from "viem";
import { exchange, perpMarket, simulatePlaceOrder, human, done } from "./lib.js";

const from = (process.argv[2] ?? "0x63284B6863D2973781DF2aE47B6F37fc8D453179") as Address;
const ex = exchange();
const markets = await ex.loadMarkets();
const rows: any[] = await (ex.client as any).listPerpMarkets();

console.log("market      lot           minQuantity    lots per minimum");
for (const m of rows) {
  const lot = BigInt(m.lotSize), min = BigInt(m.minQuantity);
  console.log(`${m.baseSymbol.padEnd(10)}  ${String(human(lot, m.baseDecimals)).padEnd(12)}  ${String(human(min, m.baseDecimals)).padEnd(13)}  ${min / lot}`);
}

const btc = await perpMarket(ex, "BTC");
const amount = 0.0001; // 10 lots of 0.00001 BTC; the minimum is 0.00013 BTC
const unified: any = (markets as any)["BTC/USDso:USDso"];
console.log(`\nBTC/USDso:USDso unified limits.amount.min = ${unified.limits.amount.min}`);
console.log(`ex.amountToPrecision("BTC/USDso:USDso", ${amount}) = ${(ex as any).amountToPrecision("BTC/USDso:USDso", amount)}  (accepted, no error)`);
console.log(`createOrder's only size guard is "quantity <= 0n after lot alignment" (dist/unified/exchange.js, createOrder)`);

const snap = await (ex.client as any).getPerpHealthSnapshot(btc.poolAddress);
const tick = BigInt(btc.tickSize);
const price = ((snap.markPrice * 90n) / 100n / tick) * tick; // resting bid, never fills
for (const qty of [10_000n, 13_000n]) {
  const r = await simulatePlaceOrder({ from, pool: btc.poolAddress, isBid: true, price, quantity: qty });
  console.log(`eth_call placeOrder BTC bid ${human(qty, 8)} BTC from ${from} -> ${r}`);
}
await done(ex);
