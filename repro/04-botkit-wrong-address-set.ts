// The bot kit (packages/perp-core/src/exchange.ts) builds its exchange for the
// Hideki testnet with SOMNIA_TESTNET_ADDRESSES, which is the SHANNON address set.
// This script builds the exchange exactly that way and compares it with the
// documented SOMNIA_HIDEKI_TESTNET_ADDRESSES.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { defineChain } from "viem";
import { pub, INDEXER } from "./lib.js";

// Same chain object the bot kit's makeChain() produces for NETWORK=hideki.
const chain = defineChain({
  id: 50383,
  name: "somnia-50383",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://api.hideki2.infra.testnet.somnia.network"],
      webSocket: ["wss://api.hideki2.infra.testnet.somnia.network/ws"],
    },
  },
});

console.log("key                  SOMNIA_TESTNET_ADDRESSES (bot kit)          SOMNIA_HIDEKI_TESTNET_ADDRESSES (docs)");
for (const k of ["collateral", "marginBank", "perpPoolFactory", "marketCreator", "priceFeedScheduler"]) {
  const a = (SOMNIA_TESTNET_ADDRESSES as any)[k], b = (SOMNIA_HIDEKI_TESTNET_ADDRESSES as any)[k];
  console.log(`${k.padEnd(20)} ${String(a).padEnd(44)} ${b}${a === b ? "" : "   <-- differs"}`);
}

for (const [label, addresses] of [
  ["bot kit: SOMNIA_TESTNET_ADDRESSES", SOMNIA_TESTNET_ADDRESSES],
  ["docs:    SOMNIA_HIDEKI_TESTNET_ADDRESSES", SOMNIA_HIDEKI_TESTNET_ADDRESSES],
] as const) {
  const factory = (addresses as any).perpPoolFactory;
  const code = await pub.getCode({ address: factory });
  const ex = new SomniaMarkets({ indexerUrl: INDEXER, chain, wsRpcUrl: "wss://api.hideki2.infra.testnet.somnia.network/ws", addresses } as any);
  const markets = await ex.loadMarkets(true);
  const swaps = Object.values(markets).filter((m: any) => m.type === "swap") as any[];
  const e = ex as any;
  console.log(`\n== ${label}`);
  console.log(`  perpPoolFactory ${factory} has code on Hideki: ${code && code !== "0x" ? "yes" : "NO"}`);
  console.log(`  perp markets ${swaps.length}, active ${swaps.filter((m) => m.active).length}, with perpStatus ${swaps.filter((m) => m.perpStatus).length}`);
  console.log(`  BTC/USDso:USDso active=${swaps.find((m) => m.base === "BTC")?.active} perpStatus=${JSON.stringify(swaps.find((m) => m.base === "BTC")?.perpStatus)}`);
  console.log(`  exchange.perpDiscoveryError: ${e.perpDiscoveryError?.message ?? e.perpDiscoveryError ?? null}`);
  await e.close?.();
}
process.exit(0);
