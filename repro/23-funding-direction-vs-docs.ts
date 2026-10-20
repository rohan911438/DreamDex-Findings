// NORMAL-23: the funding docs say "Perp below the index (negative funding):
// shorts pay longs". For every market, compare the sign of the live funding
// rate with the perp's premium to the index (mark and book mid), and show
// recent funding history.
import { exchange, done } from "./lib.js";

const ex = exchange();
await ex.loadMarkets();
const rows: any[] = await (ex.client as any).listPerpMarkets();
let belowButPositive = 0, baseline = 0;
console.log("market     mark-index   bookmid-index   funding/8h    longs pay?   rule says");
for (const m of rows.sort((a, b) => a.baseSymbol.localeCompare(b.baseSymbol))) {
  const s = `${m.baseSymbol}/USDso:USDso`;
  const [fr, book] = await Promise.all([(ex as any).fetchFundingRate(s), ex.fetchOrderBook(s, 1)]);
  const prem = (fr.markPrice / fr.indexPrice - 1) * 100;
  const mid = book.bids[0] && book.asks[0] ? (book.bids[0][0] + book.asks[0][0]) / 2 : NaN;
  const bookPrem = (mid / fr.indexPrice - 1) * 100;
  const ruleLongsPay = prem > 0 && bookPrem > 0 ? "longs pay" : prem < 0 && bookPrem < 0 ? "shorts pay" : "(mixed)";
  if (prem < 0 && bookPrem < 0 && fr.fundingRate > 0) belowButPositive++;
  if (Math.abs(fr.fundingRate - 0.0001) < 1e-12) baseline++;
  console.log(`${m.baseSymbol.padEnd(10)} ${prem.toFixed(3).padStart(8)}%    ${bookPrem.toFixed(3).padStart(8)}%     ${(fr.fundingRate * 100).toFixed(4).padStart(8)}%    ${fr.fundingRate > 0 ? "yes" : "no "}         ${ruleLongsPay}`);
}
console.log(`\nmarkets where BOTH mark and book mid are below index yet funding is positive (longs pay): ${belowButPositive} of ${rows.length}`);
console.log(`markets at exactly +0.0100% per 8h: ${baseline} of ${rows.length}`);
const hist: any[] = await (ex as any).fetchFundingRateHistory("ETH/USDso:USDso", Date.now() - 24 * 3600_000, 6);
console.log("\nETH funding history (fetchFundingRateHistory, last 24h, first 6):");
for (const h of hist) console.log(`  ${h.datetime}  mark ${h.markPrice.toFixed(4)}  index ${h.indexPrice.toFixed(4)}  (${((h.markPrice / h.indexPrice - 1) * 100).toFixed(3)}%)  funding ${(h.fundingRate * 100).toFixed(4)}%`);
await done(ex);
