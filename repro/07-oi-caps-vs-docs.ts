// Compares the "Open interest cap" column of the traders' docs table
// (app.testnet.dreamdex.io/docs/trading/perps-testnet, "Markets") with the
// live on-chain maxOpenInterest, and checks the docs' claim that a single
// account is capped at "a tenth of it on most markets".
import { exchange, done } from "./lib.js";

// Copied from the docs table on 2026-10-20.
const DOCS_OI_CAP: Record<string, number> = {
  BTC: 246.81545, ETH: 3995.6125, HYPE: 23812.72, SOL: 47654.44, XRP: 344632, ADA: 2254678,
  AVAX: 66672.2, BNB: 693.975, DOGE: 5613590, LINK: 42643.6, NEAR: 250410, SUI: 635009,
  XLM: 2677780, "1000PEPE": 130285600, LIT: 138896.6, PUMP: 87993700, TAO: 2185.491,
  VVV: 21786.14, WLD: 1264000, ZEC: 420, ZRO: 250599.5,
};

const ex = exchange();
const c = ex.client as any;
const rows: any[] = await c.listPerpMarkets();
console.log("market     docs OI cap     on-chain maxOpenInterest  chain/docs  maxPositionSize  per-account share of OI cap");
let mismatched = 0, tenth = 0;
for (const m of rows.sort((a, b) => a.baseSymbol.localeCompare(b.baseSymbol))) {
  const r = await c.getPerpRiskParams(m.poolAddress);
  const d = 10 ** m.baseDecimals;
  const cap = Number(r.maxOpenInterest) / d;
  const per = Number(r.maxPositionSize) / d;
  const docs = DOCS_OI_CAP[m.baseSymbol];
  const ratio = cap / docs;
  if (Math.abs(ratio - 1) > 1e-6) mismatched++;
  const share = per / cap;
  if (Math.abs(share - 0.1) < 1e-6) tenth++;
  console.log(`${m.baseSymbol.padEnd(10)} ${String(docs).padEnd(15)} ${cap.toPrecision(10).padEnd(25)} ${ratio.toFixed(2).padEnd(11)} ${per.toPrecision(8).padEnd(16)} ${(share * 100).toFixed(1)}%`);
}
console.log(`\n${mismatched} of ${rows.length} markets: docs OI cap != on-chain maxOpenInterest`);
console.log(`${tenth} of ${rows.length} markets: per-account cap is exactly a tenth of the OI cap`);
await done(ex);
