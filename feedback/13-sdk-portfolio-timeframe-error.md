# fetchPortfolioAnalytics with "1d"/"1w" fails with "windowStart … got NaN" instead of naming the valid timeframes
Severity: normal
Area: SDK

`fetchPortfolioAnalytics(timeframe)` accepts only `"24h" | "7d" | "30d" | "all"`. JavaScript callers, and anyone used to ccxt timeframes, pass `"1d"` or `"1w"`. The SDK then computes a `NaN` window and throws an internal-sounding error that doesn't say the timeframe is the problem or list the valid values.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 09-portfolio-timeframe-error.ts`

## Expected
`InvalidInputError: timeframe "1d" is not supported; use "24h", "7d", "30d" or "all"`. Or accept the ccxt aliases (`1d` = `24h`, `1w` = `7d`).

## Actual
```
fetchPortfolioAnalytics("7d") -> OK
fetchPortfolioAnalytics("1d") -> InvalidInputError: … windowStart must be a finite epoch-ms number, got NaN for timeframe "1d"
fetchPortfolioAnalytics("1w") -> InvalidInputError: … windowStart must be a finite epoch-ms number, got NaN for timeframe "1w"
```

## Evidence
`evidence/09-portfolio-timeframe-error.txt`; code `dist/unified/portfolioAnalytics.js:169`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only, public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
