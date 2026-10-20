// NORMAL-20: the docs say paper USDso can't open positions on six markets
// (1000PEPE, LIT, PUMP, VVV, ZEC, ZRO). For paper-USDso accounts: read
// voucherMarketAllowed per market and eth_call a minimum-size resting bid.
//
// Usage: npx tsx 20-paper-usdso-market-restriction.ts [acct1,acct2]
import type { Address } from "viem";
import { exchange, simulatePlaceOrder, done } from "./lib.js";

const DOCS_NO = ["1000PEPE", "LIT", "PUMP", "VVV", "ZEC", "ZRO"];
const accounts = (process.argv[2] ?? "0x021B6427BCc35Bd97aDBDe4021bE125eb84edbb1,0x48154fF8431cfc05C071E616C87261066714D360").split(",") as Address[];
const ex = exchange();
const c = ex.client as any;
const rows: any[] = await c.listPerpMarkets();
const bank = rows[0].marginBank;

for (const a of accounts) {
  const btc = rows.find((m) => m.baseSymbol === "BTC");
  const l = await c.getPerpLeverage({ marginBank: bank, account: a, pool: btc.poolAddress });
  console.log(`\n${a}: creditFloor ${Number(l.creditFloor) / 1e18} USDso (paper USDso present: ${l.creditFloor > 0n})`);
  let allowed = 0;
  for (const m of rows.sort((x, y) => x.baseSymbol.localeCompare(y.baseSymbol))) {
    const lev = await c.getPerpLeverage({ marginBank: bank, account: a, pool: m.poolAddress });
    if (lev.voucherMarketAllowed) allowed++;
    if (!DOCS_NO.includes(m.baseSymbol)) continue;
    const snap = await c.getPerpHealthSnapshot(m.poolAddress);
    const tick = BigInt(m.tickSize);
    const price = ((snap.markPrice * 95n) / 100n / tick) * tick;
    const pos = await c.getPerpPosition({ marginBank: bank, account: a, pool: m.poolAddress });
    const r = await simulatePlaceOrder({ from: a, pool: m.poolAddress, isBid: true, price, quantity: BigInt(m.minQuantity) });
    console.log(`  ${m.baseSymbol.padEnd(9)} docs: "No" | voucherMarketAllowed ${lev.voucherMarketAllowed} | current position ${pos.size} | eth_call open (min size) -> ${r}`);
  }
  console.log(`  voucherMarketAllowed = true on ${allowed} of ${rows.length} markets`);
}
await done(ex);
