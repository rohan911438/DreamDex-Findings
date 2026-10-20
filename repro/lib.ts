// Shared helpers for the reproduction scripts.
//
// Everything here is READ-ONLY: chain reads, indexer reads and eth_call
// simulations. Nothing is signed or broadcast, and no private key is needed.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, contractErrorsAbi, perpPoolWriteAbi } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, decodeErrorResult, encodeFunctionData, formatUnits, http, parseAbi, zeroAddress, type Address } from "viem";

export const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql";
export const pub = createPublicClient({ chain: hidekiTestnet, transport: http() });

/** The documented setup from app.testnet.dreamdex.io/docs/developers/perps-testnet ("Connect"). */
export function exchange(account?: Address) {
  return new SomniaMarkets({
    chain: hidekiTestnet,
    indexerUrl: INDEXER,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    ...(account ? { account } : {}),
  });
}

export async function perpMarket(ex: SomniaMarkets, base: string): Promise<any> {
  const rows: any[] = await (ex.client as any).listPerpMarkets();
  const m = rows.find((r) => r.baseSymbol === base);
  if (!m) throw new Error(`no perp market ${base}`);
  return m;
}

/** Far-future expiry, the same value the SDK sends (Writer.farFutureNs). */
export const farFutureNs = () => BigInt(Math.floor(Date.now() / 1000) + 50 * 365 * 24 * 3600) * 1_000_000_000n;

/** Decode a revert from a viem error into "ErrorName(args)" using the SDK's error ABI. */
export function revertName(e: any): string {
  const raw = e?.cause?.data ?? e?.walk?.((x: any) => x?.data)?.data;
  if (typeof raw === "string" && raw.length >= 10) {
    try {
      const d = decodeErrorResult({ abi: contractErrorsAbi as any, data: raw as `0x${string}` });
      return `${d.errorName}(${(d.args ?? []).join(",")})`;
    } catch {
      return `raw ${raw.slice(0, 10)}`;
    }
  }
  return String(e?.shortMessage ?? e?.message ?? e).slice(0, 160);
}

/** eth_call PerpPool.placeOrder as `from`. Returns "OK" or the decoded revert. */
export async function simulatePlaceOrder(p: {
  from: Address; pool: Address; isBid: boolean; price: bigint; quantity: bigint;
  orderType?: number; expireTimestampNs?: bigint; blockNumber?: bigint;
}): Promise<string> {
  const data = encodeFunctionData({
    abi: perpPoolWriteAbi,
    functionName: "placeOrder",
    args: [p.isBid, 0n, p.price, p.quantity, p.expireTimestampNs ?? farFutureNs(), p.orderType ?? 0, 0, zeroAddress, 0n],
  });
  try {
    await pub.call({ account: p.from, to: p.pool, data, gas: 10_000_000n, blockNumber: p.blockNumber });
    return "OK";
  } catch (e) {
    return revertName(e);
  }
}

const bookAbi = parseAbi([
  "function getAllOpenOrdersOffChain(bool isBid, uint256 maxCount, uint64 startCursor) view returns ((uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs)[] orders, bool hasMoreOrders, uint64 nextCursor)",
]);

/** One owner's resting orders on one side of a pool, read from the pool itself. */
export async function restingOrders(pool: Address, owner: Address, isBid: boolean, blockNumber?: bigint) {
  const mine: { orderId: bigint; price: bigint; remaining: bigint }[] = [];
  let cursor = 0n;
  for (let page = 0; page < 200; page++) {
    const [orders, more, next] = await pub.readContract({
      address: pool, abi: bookAbi, functionName: "getAllOpenOrdersOffChain", args: [isBid, 500n, cursor], blockNumber,
    });
    for (const o of orders) if (o.owner.toLowerCase() === owner.toLowerCase()) mine.push({ orderId: o.orderId, price: o.price, remaining: o.quantityRemaining });
    if (!more) break;
    cursor = next;
  }
  return mine;
}

export const human = (raw: bigint, decimals: number) => formatUnits(raw, decimals);
export const J = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));

export async function done(ex?: SomniaMarkets): Promise<never> {
  try { await (ex as any)?.close?.(); } catch { /* ignore */ }
  process.exit(0);
}
