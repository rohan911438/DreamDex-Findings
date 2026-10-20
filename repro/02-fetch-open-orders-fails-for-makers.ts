// fetchOpenOrders on a perp market fails with "indexer PerpPortfolio failed:
// database query error" (after ~10 s) for accounts that actively make markets,
// while the pool itself shows those accounts' resting orders.
//
// Usage: npx tsx 02-fetch-open-orders-fails-for-makers.ts [acct1,acct2,...]
import type { Address } from "viem";
import { exchange, perpMarket, restingOrders, done } from "./lib.js";

const accounts = (process.argv[2] ??
  [
    "0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF", // active market maker
    "0x420691db9D2B5a79210FDA48c177471386b6Dfd1", // active market maker
    "0x63284B6863D2973781DF2aE47B6F37fc8D453179", // control: holds positions, no resting orders
  ].join(",")).split(",") as Address[];

const probe = exchange();
const btc = await perpMarket(probe, "BTC");

for (const account of accounts) {
  const onChain = [...(await restingOrders(btc.poolAddress, account, true)), ...(await restingOrders(btc.poolAddress, account, false))];
  const ex = exchange(account);
  await ex.loadMarkets();
  for (const attempt of [1, 2, 3]) {
    const t = Date.now();
    try {
      const rows = await ex.fetchOpenOrders("BTC/USDso:USDso");
      console.log(`${account} attempt ${attempt}: fetchOpenOrders -> ${rows.length} orders in ${Date.now() - t} ms | pool shows ${onChain.length} resting BTC orders`);
    } catch (e: any) {
      console.log(`${account} attempt ${attempt}: fetchOpenOrders THREW ${e?.name}: ${e?.message} (after ${Date.now() - t} ms) | pool shows ${onChain.length} resting BTC orders`);
    }
  }
  await (ex as any).close?.();
}
await done(probe);
