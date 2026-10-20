// The developer docs' "Raw and operator calls" section shows the placeOrderFor
// signature with expireTimestampNs but never says what to pass. The natural
// "0 = no expiry" reverts OrderAlreadyExpired; the SDK silently sends now + 50y.
import type { Address } from "viem";
import { exchange, perpMarket, simulatePlaceOrder, farFutureNs, done } from "./lib.js";

const from = (process.argv[2] ?? "0x63284B6863D2973781DF2aE47B6F37fc8D453179") as Address;
const ex = exchange();
const btc = await perpMarket(ex, "BTC");
const snap = await (ex.client as any).getPerpHealthSnapshot(btc.poolAddress);
const tick = BigInt(btc.tickSize);
const price = ((snap.markPrice * 90n) / 100n / tick) * tick;
const quantity = BigInt(btc.minQuantity);
for (const [label, exp] of [
  ["expireTimestampNs = 0", 0n],
  ["expireTimestampNs = 2^64-1 (max uint64)", 2n ** 64n - 1n],
  ["expireTimestampNs = now + 50y (what the SDK sends)", farFutureNs()],
] as const) {
  console.log(`${label.padEnd(52)} -> ${await simulatePlaceOrder({ from, pool: btc.poolAddress, isBid: true, price, quantity, expireTimestampNs: exp })}`);
}
await done(ex);
