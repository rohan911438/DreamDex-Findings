// What perp-maker's loop sees during an RPC outage. Each cycle it calls
// perp-core requireMarket(..., { reload: true }) -> loadMarkets(true), then
// fetchPositions(). This checks whether those calls THROW when the chain RPC
// is unreachable. In perp-maker an exception there is outside the try/catch
// that protects placement, so main() rejects and process.exit(1) runs without
// cancelling the quotes from the previous cycle.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { defineChain } from "viem";

const dead = defineChain({
  id: 50383, name: "hideki-rpc-down", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:9"], webSocket: ["ws://127.0.0.1:9"] } },
});
const ex = new SomniaMarkets({ chain: dead, wsRpcUrl: "ws://127.0.0.1:9", indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, account: "0x63284B6863D2973781DF2aE47B6F37fc8D453179" } as any);
for (const [label, fn] of [
  ["loadMarkets(true)", () => ex.loadMarkets(true)],
  ["fetchPositions()", () => ex.fetchPositions()],
] as const) {
  const t = Date.now();
  try { const r: any = await (fn as any)(); console.log(`${label}: resolved (${Array.isArray(r) ? r.length : Object.keys(r).length} entries) in ${Date.now() - t} ms`); }
  catch (e: any) { console.log(`${label}: THREW ${e?.name}: ${String(e?.message).slice(0, 160)} (${Date.now() - t} ms)`); }
}
process.exit(0);
