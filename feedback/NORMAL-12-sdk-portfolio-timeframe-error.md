# NORMAL-12 · `fetchPortfolioAnalytics("1d")` fails with "windowStart … got NaN" instead of naming the valid timeframes
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified `fetchPortfolioAnalytics` |
| **Affects** | JavaScript callers, and anyone using ccxt-style timeframes (`1d`, `1w`) |
| **Reproduce** | `npx tsx repro/12-portfolio-timeframe-error.ts` |
| **Evidence** | [`evidence/12-portfolio-timeframe-error.log`](../evidence/12-portfolio-timeframe-error.log), [`evidence/code/12-sdk-dist_unified_portfolioAnalytics_js.txt`](../evidence/code/12-sdk-dist_unified_portfolioAnalytics_js.txt) |

## Summary

`fetchPortfolioAnalytics(timeframe)` accepts only `"24h" | "7d" | "30d" | "all"`. The TypeScript type enforces that, but untyped callers, and anyone used to ccxt timeframes, will pass `"1d"` or `"1w"`. The SDK doesn't validate the value up front. It computes a `NaN` window and then throws an internal-sounding message from a defensive check. The code comment calls this a "belt-and-braces" check that "no test can distinguish" and admits a bad timeframe "from an untyped caller reports itself here".

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 12-portfolio-timeframe-error.ts`. This calls `fetchPortfolioAnalytics` for a public account with `"7d"`, `"1d"` and `"1w"`.

## Expected

`InvalidInputError: timeframe "1d" is not supported; use "24h", "7d", "30d" or "all"`. Or accept the ccxt aliases (`1d` → `24h`, `1w` → `7d`).

## Actual

```
fetchPortfolioAnalytics("7d") -> OK
fetchPortfolioAnalytics("1d") -> InvalidInputError: … windowStart must be a finite epoch-ms number, got NaN for timeframe "1d"
fetchPortfolioAnalytics("1w") -> InvalidInputError: … windowStart must be a finite epoch-ms number, got NaN for timeframe "1w"
```

## Evidence

- Log: [`evidence/12-portfolio-timeframe-error.log`](../evidence/12-portfolio-timeframe-error.log)
- Source: [`evidence/code/12-sdk-dist_unified_portfolioAnalytics_js.txt`](../evidence/code/12-sdk-dist_unified_portfolioAnalytics_js.txt) (`dist/unified/portfolioAnalytics.js` lines 160-171)

## Suggested fix

Validate `timeframe` against the supported set at the top of `fetchPortfolioAnalytics` and name the valid values in the error.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
