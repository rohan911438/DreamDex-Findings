// MAJOR-18: MarginBank.getWithdrawableCollateral (surfaced by the SDK as
// getMarginAccount().withdrawable) vs the largest amount MarginBank.withdraw
// actually accepts. For each account, at ONE pinned block:
//   - read the view,
//   - eth_call withdraw(view),
//   - binary-search the largest accepted withdraw (0.000001 USDso steps).
//
// Usage: npx tsx 18-withdrawable-view-overstates.ts [acct1,acct2,...]
import { marginBankWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, parseAbi, type Address } from "viem";
import { exchange, perpMarket, pub, revertName, done } from "./lib.js";

const accounts = (process.argv[2] ??
  [
    "0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF",
    "0x85C6956392AeeA8dceC55E6DED069506f248a831",
    "0x420691db9D2B5a79210FDA48c177471386b6Dfd1",
    "0xDF198f8a0E7e8c1741b518abdc42Be53EA6020d7",
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
const usd = (x: bigint) => (Number(x) / 1e18).toFixed(6);

console.log(`MarginBank ${bank}`);
console.log("account                                      block      equity           view(withdrawable)  withdraw(view)                         largest accepted   view / true");
for (const a of accounts) {
  const block = await pub.getBlockNumber();
  const [view, health, acct] = await Promise.all([
    pub.readContract({ address: bank, abi: viewAbi, functionName: "getWithdrawableCollateral", args: [a], blockNumber: block }),
    (ex.client as any).getAccountHealth(bank, a),
    (ex.client as any).getMarginAccount(bank, a),
  ]);
  const atView = view > 0n ? await withdraw(a, view, block) : "(view is 0)";
  const step = 10n ** 12n;
  let lo = 0n, hi = (health.equity > 0n ? health.equity : 0n) / step + 1n;
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if ((await withdraw(a, mid * step, block)) === "OK") lo = mid; else hi = mid - 1n;
  }
  const trueMax = lo * step;
  const ratio = trueMax > 0n ? (Number(view) / Number(trueMax)).toFixed(2) + "x" : "n/a";
  console.log(`${a} ${block} ${usd(health.equity).padStart(16)} ${usd(view).padStart(18)}  ${atView.padEnd(38)} ${usd(trueMax).padStart(16)}  ${ratio}`);
  console.log(`   SDK getMarginAccount().withdrawable = ${usd(acct.withdrawable)} | imReq ${usd(health.imReq)} | unlocked ${usd(acct.unlockedCollateralBalance)} | locked ${usd(acct.lockedCollateral)}`);
}
await done(ex);
