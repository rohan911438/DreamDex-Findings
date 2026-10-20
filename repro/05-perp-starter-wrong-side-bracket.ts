// perp-starter "manages" an existing position but builds the TP/SL bracket from
// PERP_SIDE (default "long"), not from the position's real side. This script
// simulates (eth_call) the bracket perp-starter's armBracket() would send for a
// SHORT position, next to the correct one, from a real account that holds a
// BTC short and has already approved the BTC stop registry.
//
// The calldata embeds the owner, so it is built AS that owner through an
// address-only wallet client: no key exists, nothing can be signed.
//
// Usage: npx tsx 05-perp-starter-wrong-side-bracket.ts [account]
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { createWalletClient, http, type Address } from "viem";
import { exchange, perpMarket, pub, revertName, INDEXER, done } from "./lib.js";

const OPERATOR_REGISTRY = "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a";
const ro = exchange();
const btc = await perpMarket(ro, "BTC");
const snap = await (ro.client as any).getPerpHealthSnapshot(btc.poolAddress);
const tick = BigInt(btc.tickSize);
const al = (x: bigint) => (x / tick) * tick;
// perp-starter defaults: PERP_TAKE_PROFIT_PCT=2, PERP_STOP_LOSS_PCT=1, levels off the live mark.
const up = al((snap.markPrice * 10200n) / 10000n);
const down = al((snap.markPrice * 9900n) / 10000n);

async function simulateBracket(owner: Address, isBid: boolean, tp: bigint, tpOp: 0 | 1, sl: bigint, slOp: 0 | 1) {
  const asOwner = new SomniaMarkets({
    chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    walletClient: createWalletClient({ account: owner, chain: hidekiTestnet, transport: http() }),
  } as any);
  const { stopOrder } = await (asOwner.trader as any).buildPlacePerpStopOrder({
    registry: btc.stopRegistry, pool: btc.poolAddress, operatorRegistry: OPERATOR_REGISTRY,
    isBid, quantity: 0n, triggerPrice: tp, triggerOperator: tpOp, stopOrderType: 1, intent: "reduceOnly",
    skipOperatorApproval: true,
    pair: { isBid, quantity: 0n, triggerPrice: sl, triggerOperator: slOp, stopOrderType: 1 },
  });
  try {
    await pub.call({ account: owner, to: stopOrder.to, data: stopOrder.data, value: BigInt(stopOrder.value ?? 0), gas: 10_000_000n });
    return "ACCEPTED (would arm)";
  } catch (e) {
    return `REJECTED ${revertName(e)}`;
  }
}

// Find a BTC short holder who has approved the BTC stop registry (has used stops before).
let owner = process.argv[2] as Address | undefined;
if (!owner) {
  const res = await fetch(INDEXER, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: `{ StopOrder(where:{registry:{_eq:"${btc.stopRegistry.toLowerCase()}"}}, limit: 1000, order_by:{createdAt: desc}) { owner } }` }),
  });
  const owners = [...new Set(((await res.json()).data.StopOrder as any[]).map((s) => s.owner))] as Address[];
  for (const a of owners) {
    if ((await pub.getBalance({ address: a })) < 10n ** 18n) continue;
    const p = await (ro.client as any).getPerpPosition({ marginBank: btc.marginBank, account: a, pool: btc.poolAddress });
    if (p.size >= 0n) continue;
    if ((await simulateBracket(a, true, down, 1, up, 0)).startsWith("ACCEPTED")) { owner = a; break; }
  }
}
if (!owner) throw new Error("no approved BTC short holder found right now; pass one as argv[2]");
const pos = await (ro.client as any).getPerpPosition({ marginBank: btc.marginBank, account: owner, pool: btc.poolAddress });
console.log(`owner ${owner}, BTC position ${pos.size} raw (negative = SHORT), mark ${Number(snap.markPrice) / 1e18}`);
console.log(`levels: +2% = ${Number(up) / 1e18}, -1% = ${Number(down) / 1e18}`);
console.log(`correct bracket for the short   (buy legs, TP <= -1%, SL >= +2%): ${await simulateBracket(owner, true, down, 1, up, 0)}`);
console.log(`perp-starter with PERP_SIDE=long (sell legs, TP >= +2%, SL <= -1%): ${await simulateBracket(owner, false, up, 0, down, 1)}`);
await done(ro);
