// NORMAL-26: the Errors page says "Every mainnet and testnet pool currently
// runs a 100000 (100 BPS) cap" for builder codes. Every perp pool's
// getMaxBuilderFeeBpsTimes1k() returns 10000 (10 bps). Enforcement is correct;
// only the documented value is wrong. Also shows the revert ladder.
import { perpPoolWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, parseAbi, type Address } from "viem";
import { exchange, pub, revertName, farFutureNs, done } from "./lib.js";

const FROM = (process.argv[2] ?? "0x63284B6863D2973781DF2aE47B6F37fc8D453179") as Address;
const BUILDER = "0x000000000000000000000000000000000000bEEF" as Address; // never approved
const ex = exchange();
const c = ex.client as any;
const perps: any[] = await c.listPerpMarkets();
const capAbi = parseAbi(["function getMaxBuilderFeeBpsTimes1k() view returns (uint96)"]);

const caps: Record<string, number> = {};
for (const m of perps) {
  const cap = await pub.readContract({ address: m.poolAddress, abi: capAbi, functionName: "getMaxBuilderFeeBpsTimes1k" }).catch(() => -1n);
  caps[cap.toString()] = (caps[cap.toString()] ?? 0) + 1;
}
console.log(`perp pool builder-fee cap (bpsTimes1k) across ${perps.length} markets -> ${JSON.stringify(caps)}`);
console.log(`docs (Errors page, BuilderCodesNotSupported): "Every mainnet and testnet pool currently runs a 100000 (100 BPS) cap"`);
console.log(`actual: 10000 (= 10 bps = 0.10%), i.e. 10x smaller than documented\n`);

// Enforcement ladder on BTC, from an account that has NOT approved BUILDER.
const btc = perps.find((m) => m.baseSymbol === "BTC");
const snap = await c.getPerpHealthSnapshot(btc.poolAddress);
const price = ((snap.markPrice * 95n) / 100n / BigInt(btc.tickSize)) * BigInt(btc.tickSize);
const q = BigInt(btc.minQuantity);
async function sim(fee: bigint) {
  const data = encodeFunctionData({ abi: perpPoolWriteAbi, functionName: "placeOrder", args: [true, 0n, price, q, farFutureNs(), 0, 0, BUILDER, fee] });
  try { await pub.call({ account: FROM, to: btc.poolAddress, data, gas: 10_000_000n }); return "ACCEPTED"; } catch (e) { return revertName(e); }
}
for (const f of [0n, 1000n, 10000n, 10001n, 50000n, 100000n]) {
  console.log(`BTC placeOrder builderFeeBpsTimes1k=${String(f).padStart(6)} (unapproved builder) -> ${await sim(f)}`);
}
await done(ex);
