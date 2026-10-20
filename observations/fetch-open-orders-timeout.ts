// (withdrawn observation) fetchOpenOrders on a perp market intermittently fails with
// "indexer PerpPortfolio failed: database query error" after ~10 s for
// high-activity accounts, while ordinary accounts answer in ~150-300 ms.
//
// Each attempt calls fetchOpenOrders, then immediately reads the account's
// resting orders from the pool itself, so the two counts describe (nearly)
// the same moment.
//
// Usage: npx tsx 02-fetch-open-orders-fails-for-makers.ts [acct1,acct2,...] [attempts]
import type { Address } from "viem";
import { exchange, perpMarket, restingOrders, pub, done } from "../repro/lib.js";

const accounts = (process.argv[2] ??
  [
    "0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF", // active market maker, 21 markets
    "0x420691db9D2B5a79210FDA48c177471386b6Dfd1", // active multi-market bot
    "0x63284B6863D2973781DF2aE47B6F37fc8D453179", // control: holds positions, no resting orders
  ].join(",")).split(",") as Address[];
const attempts = Number(process.argv[3] ?? 8);

const probe = exchange();
const btc = await perpMarket(probe, "BTC");

for (const account of accounts) {
  const ex = exchange(account);
  await ex.loadMarkets();
  let failures = 0;
  const times: number[] = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const t = Date.now();
    let result: string;
    try {
      const rows = await ex.fetchOpenOrders("BTC/USDso:USDso");
      result = `${rows.length} orders`;
    } catch (e: any) {
      failures++;
      result = `THREW ${e?.name}: ${e?.message}`;
    }
    const ms = Date.now() - t;
    times.push(ms);
    const head = await pub.getBlockNumber();
    const pool = [...(await restingOrders(btc.poolAddress, account, true, head)), ...(await restingOrders(btc.poolAddress, account, false, head))];
    console.log(`${account} #${attempt}: ${result} (${ms} ms) | pool at block ${head}: ${pool.length} resting BTC orders`);
    await new Promise((r) => setTimeout(r, 5_000));
  }
  console.log(`${account} summary: ${failures}/${attempts} failed, median ${times.sort((a, b) => a - b)[Math.floor(times.length / 2)]} ms\n`);
  await (ex as any).close?.();
}
await done(probe);
