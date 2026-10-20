// For a perps trader, the unified fetchBalance shows only wallet balances. The
// USDso in the Perps account (MarginBank) appears nowhere in it.
import type { Address } from "viem";
import { exchange, perpMarket, human, done } from "./lib.js";

const account = (process.argv[2] ?? "0x63284B6863D2973781DF2aE47B6F37fc8D453179") as Address;
const ex = exchange(account);
const btc = await perpMarket(ex, "BTC");
const bal: any = await ex.fetchBalance();
const acct = await (ex.client as any).getMarginAccount(btc.marginBank, account);
console.log(`account ${account}`);
console.log(`fetchBalance().USDso            = ${JSON.stringify({ free: bal.USDso?.free, used: bal.USDso?.used, total: bal.USDso?.total })}`);
console.log(`getMarginAccount (Perps account) = unlocked ${human(acct.unlockedCollateralBalance, 18)} USDso, locked ${human(acct.lockedCollateral, 18)}, equity ${human(acct.equity, 18)}`);
console.log(`fetchBalance keys: ${Object.keys(bal).join(", ")}`);
await done(ex);
