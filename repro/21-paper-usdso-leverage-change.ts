// NORMAL-21: the docs say a paper-USDso account's leverage setting "can't be
// changed while it remains". eth_call MarginBank.setMaxLeverage from accounts
// that hold paper USDso.
import { marginBankWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, type Address } from "viem";
import { exchange, pub, revertName, done } from "./lib.js";

const accounts = (process.argv[2] ?? "0x021B6427BCc35Bd97aDBDe4021bE125eb84edbb1,0x63284B6863D2973781DF2aE47B6F37fc8D453179").split(",") as Address[];
const ex = exchange();
const c = ex.client as any;
const rows: any[] = await c.listPerpMarkets();
const bank = rows[0].marginBank as Address;
for (const a of accounts) {
  for (const base of ["BTC", "ADA", "ETH"]) {
    const m = rows.find((x) => x.baseSymbol === base);
    const lev = await c.getPerpLeverage({ marginBank: bank, account: a, pool: m.poolAddress });
    const current = await c.getPerpMaxLeverage({ marginBank: bank, account: a, pool: m.poolAddress });
    const marketMax = Math.round(Number(lev.marketMaxLeverageBps) / 1e4);
    const out: string[] = [];
    for (const x of [2, Math.max(2, marketMax - 1), marketMax]) {
      if (x === current) continue;
      const data = encodeFunctionData({ abi: marginBankWriteAbi, functionName: "setMaxLeverage", args: [m.poolAddress, x] });
      try { await pub.call({ account: a, to: bank, data, gas: 10_000_000n }); out.push(`${x}x OK`); } catch (e) { out.push(`${x}x ${revertName(e)}`); }
    }
    console.log(`${a} ${base.padEnd(4)} paper USDso ${Number(lev.creditFloor) / 1e18} | current ${current || "unset"} | market max ${marketMax}x | setMaxLeverage: ${out.join(", ")}`);
  }
}
await done(ex);
