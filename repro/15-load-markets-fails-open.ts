// NORMAL-15: independent of the bot kit. Use the CORRECT Hideki address set but
// point perpPoolFactory at an address with no code (standing in for any failed
// status read). The SDK records perpDiscoveryError and still marks every perp
// market active: true.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { INDEXER, pub } from "./lib.js";

const NO_CODE = "0x000000000000000000000000000000000000dEaD";
console.log(`code at ${NO_CODE}: ${(await pub.getCode({ address: NO_CODE })) ?? "none"}`);
for (const [label, addresses] of [
  ["control: SOMNIA_HIDEKI_TESTNET_ADDRESSES", SOMNIA_HIDEKI_TESTNET_ADDRESSES],
  ["same set, perpPoolFactory unreadable", { ...SOMNIA_HIDEKI_TESTNET_ADDRESSES, perpPoolFactory: NO_CODE }],
] as const) {
  const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses } as any);
  const markets = await ex.loadMarkets(true);
  const perps = Object.values(markets).filter((m: any) => m.type === "swap") as any[];
  const e = ex as any;
  console.log(`\n== ${label}`);
  console.log(`  perp markets: ${perps.length}, active: ${perps.filter((m) => m.active === true).length}, with perpStatus: ${perps.filter((m) => m.perpStatus).length}`);
  console.log(`  perpDiscoveryError: ${e.perpDiscoveryError?.message ?? null}`);
  await e.close?.();
}
process.exit(0);
