// fetchPortfolioAnalytics with a timeframe outside "24h" | "7d" | "30d" | "all"
// (for example the ccxt-standard "1d") fails with a NaN message that does not
// name the valid values.
import type { Address } from "viem";
import { exchange, done } from "./lib.js";

const account = (process.argv[2] ?? "0x63284B6863D2973781DF2aE47B6F37fc8D453179") as Address;
const ex = exchange(account);
for (const tf of ["7d", "1d", "1w"]) {
  try {
    await (ex as any).fetchPortfolioAnalytics(tf);
    console.log(`fetchPortfolioAnalytics("${tf}") -> OK`);
  } catch (e: any) {
    console.log(`fetchPortfolioAnalytics("${tf}") -> ${e?.name}: ${e?.message}`);
  }
}
await done(ex);
