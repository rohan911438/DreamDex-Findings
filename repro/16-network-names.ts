// NORMAL-16: what the SDK calls the two Somnia testnets, next to the RPC's own
// chain id. The bounty calls the perps network "Somnia Tokyo testnet"; none of
// these names say Tokyo.
import * as chains from "@somnia-chain/markets-sdk/chains";
import { pub } from "./lib.js";

for (const [exportName, c] of Object.entries<any>(chains)) {
  if (!c || typeof c !== "object" || typeof c.id !== "number") continue;
  if (![50383, 50312].includes(c.id)) continue;
  console.log(`chains.${exportName.padEnd(16)} id ${c.id}  name "${c.name}"  rpc ${c.rpcUrls?.default?.http?.[0]}`);
}
console.log(`eth_chainId of https://api.hideki2.infra.testnet.somnia.network = ${await pub.getChainId()}`);
console.log(`address-set exports: SOMNIA_TESTNET_ADDRESSES (chain 50312, Shannon), SOMNIA_HIDEKI_TESTNET_ADDRESSES (chain 50383)`);
process.exit(0);
