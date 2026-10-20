// NORMAL-19: the app's perps withdraw ceiling (perpWithdrawableCeiling in the
// public app bundle, see evidence/code/19-app-perpWithdrawableCeiling.txt)
// on paper-USDso accounts. Same formula, evaluated on chain data, then the
// result is eth_call'ed as MarginBank.withdraw at the same block.
//
// Usage: npx tsx 19-app-withdraw-ceiling-paper-usdso.ts [acct1,acct2,...]
import { marginBankWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, parseAbi, type Address } from "viem";
import { exchange, perpMarket, pub, revertName, done } from "./lib.js";

const accounts = (process.argv[2] ??
  [
    "0x021B6427BCc35Bd97aDBDe4021bE125eb84edbb1",
    "0xDc2a6e2f1A0D1bbE1bc19dE4f91937f195E986A0",
    "0x63284B6863D2973781DF2aE47B6F37fc8D453179",
  ].join(",")).split(",") as Address[];

const ex = exchange();
const btc = await perpMarket(ex, "BTC");
const bank = btc.marginBank as Address;
const viewAbi = parseAbi(["function getWithdrawableCollateral(address account) view returns (uint256)"]);
async function withdraw(from: Address, amount: bigint, blockNumber: bigint) {
  const data = encodeFunctionData({ abi: marginBankWriteAbi, functionName: "withdraw", args: [amount] });
  try { await pub.call({ account: from, to: bank, data, gas: 10_000_000n, blockNumber }); return "OK"; }
  catch (e) { return revertName(e); }
}
// Verbatim logic of the app's perpWithdrawableCeiling.
function appCeiling(e: { withdrawable: bigint; imReq: bigint; equity: bigint }) {
  const t = e.withdrawable > 0n ? e.withdrawable : 0n;
  if (e.imReq <= 0n) return t;
  const r = e.equity - e.imReq;
  if (r <= 0n) return 0n;
  const n = (99n * r) / 100n;
  return n < t ? n : t;
}
const usd = (x: bigint) => (Number(x) / 1e18).toFixed(6);

for (const a of accounts) {
  const block = await pub.getBlockNumber();
  const [view, health, lev] = await Promise.all([
    pub.readContract({ address: bank, abi: viewAbi, functionName: "getWithdrawableCollateral", args: [a], blockNumber: block }),
    (ex.client as any).getAccountHealth(bank, a),
    (ex.client as any).getPerpLeverage({ marginBank: bank, account: a, pool: btc.poolAddress }),
  ]);
  const ceiling = appCeiling({ withdrawable: view, imReq: health.imReq, equity: health.equity });
  const atCeiling = ceiling > 0n ? await withdraw(a, ceiling, block) : "(app shows 0)";
  const step = 10n ** 12n;
  let lo = 0n, hi = (health.equity > 0n ? health.equity : 0n) / step + 1n;
  while (lo < hi) { const mid = (lo + hi + 1n) / 2n; if ((await withdraw(a, mid * step, block)) === "OK") lo = mid; else hi = mid - 1n; }
  console.log(`${a} @${block}: credit floor ${usd(lev.creditFloor)} | equity ${usd(health.equity)} | app ceiling ${usd(ceiling)} -> withdraw: ${atCeiling} | largest accepted ${usd(lo * step)}`);
}
await done(ex);
