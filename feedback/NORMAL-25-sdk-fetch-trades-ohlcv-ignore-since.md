# NORMAL-25 · `fetchTrades` and `fetchOHLCV` return the newest rows instead of starting at `since`, so history can't be paged
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified `fetchTrades(symbol, since, limit)` and `fetchOHLCV(symbol, timeframe, since, limit)` |
| **Affects** | Backtests, data exports, any ccxt-style history download |
| **Reproduce** | `npx tsx repro/25-fetch-trades-ohlcv-ignore-since.ts` (read-only) |
| **Evidence** | [`evidence/25-fetch-trades-ohlcv-ignore-since.log`](../evidence/25-fetch-trades-ohlcv-ignore-since.log) |

## Summary

Both methods take ccxt's `(…, since, limit)` signature. In ccxt, `since` is the **start** of the requested range, and callers page forward by moving `since` to the last timestamp received. Here both methods treat `since` only as a lower-bound filter and return the **newest** `limit` rows. Asking for 20 trades or 20 one-minute candles "since 10 hours ago" returns the last 20 seconds of trades or the last 20 minutes of candles. Nothing older than the newest page is reachable, and the ccxt paging loop ends after one page.

`fetchFundingRateHistory` with the same arguments **does** start at `since`, so the three history methods behave inconsistently. `fetchTrades` is documented as "newest first", but `since` and `limit` are presented with ccxt's meaning and no alternative is offered.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 25-fetch-trades-ohlcv-ignore-since.ts`. This calls all three methods for BTC with `since` = 10 hours ago, then tries a ccxt-style next page.

## Expected

`fetchTrades(S, since, 20)` returns the first 20 trades at or after `since`, and `fetchOHLCV(S, "1m", since, 20)` the 20 candles starting at `since`, as `fetchFundingRateHistory` does.

## Actual

```
since = 2026-10-20T03:49:55Z

fetchTrades(BTC/USDso:USDso, since, 20)            -> 20 rows, 2026-10-20T13:49:50Z .. 13:49:55Z   (newest 5 seconds)
fetchOHLCV(BTC/USDso:USDso, "1m", since, 20)       -> 20 rows, 2026-10-20T13:30:00Z .. 13:49:00Z   (newest 20 minutes)
fetchFundingRateHistory(BTC/USDso:USDso, since, 5) -> 5 rows,  2026-10-20T04:11:43Z .. 08:11:43Z   (starts at since)

ccxt-style next page: fetchTrades(BTC/USDso:USDso, lastSeen+1, 20) -> 0 rows
```

## Evidence

- Log: [`evidence/25-fetch-trades-ohlcv-ignore-since.log`](../evidence/25-fetch-trades-ohlcv-ignore-since.log)
- SDK typings: `fetchTrades` is documented as "Recent public trades … (indexer, newest first)"; `fetchOHLCV` and `fetchFundingRateHistory` share the `since, limit` signature.

## Impact

History older than one page can't be downloaded through the unified API, which blocks backtests and analytics on the markets the bounty asks builders to target. ccxt-style code silently gets only the most recent data and stops.

## Suggested fix

Return rows **from** `since`, oldest first, when `since` is given (keeping newest-first when it's omitted), or add an explicit cursor/`until` parameter. Make the three history methods consistent and document the behaviour.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · indexer `https://hideki-dev.smk.somnia.host/v1/graphql` · Somnia Tokyo testnet (Hideki, chain 50383) · read-only.
