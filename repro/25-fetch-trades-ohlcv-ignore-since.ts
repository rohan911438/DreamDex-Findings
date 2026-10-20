// NORMAL-25: fetchTrades(symbol, since, limit) and fetchOHLCV(symbol, tf, since, limit)
// return the NEWEST `limit` rows at or after `since`, not the rows starting at
// `since`, so history older than the newest page can't be paged.
// fetchFundingRateHistory with the same arguments DOES start at `since`.
import { exchange, done } from "./lib.js";

const ex = exchange();
await ex.loadMarkets();
const iso = (t: number) => new Date(t).toISOString();
const S = "BTC/USDso:USDso";
const since = Date.now() - 10 * 3600_000; // 10 hours ago
const span = (rows: number[]) => (rows.length ? `${iso(Math.min(...rows))} .. ${iso(Math.max(...rows))}` : "-");

const trades: any[] = await (ex as any).fetchTrades(S, since, 20);
console.log(`since = ${iso(since)}\n`);
console.log(`fetchTrades(${S}, since, 20)            -> ${trades.length} rows, ${span(trades.map((t) => t.timestamp))}`);
const candles: any[] = await (ex as any).fetchOHLCV(S, "1m", since, 20);
console.log(`fetchOHLCV(${S}, "1m", since, 20)       -> ${candles.length} rows, ${span(candles.map((c) => c[0]))}`);
const funding: any[] = await (ex as any).fetchFundingRateHistory(S, since, 5);
console.log(`fetchFundingRateHistory(${S}, since, 5) -> ${funding.length} rows, ${span(funding.map((f) => f.timestamp))}`);
// Paging attempt the ccxt way: advance `since` to the last timestamp seen.
const page2: any[] = await (ex as any).fetchTrades(S, Math.max(...trades.map((t) => t.timestamp)) + 1, 20);
console.log(`\nccxt-style next page: fetchTrades(${S}, lastSeen+1, 20) -> ${page2.length} rows, ${span(page2.map((t) => t.timestamp))}`);
await done(ex);
