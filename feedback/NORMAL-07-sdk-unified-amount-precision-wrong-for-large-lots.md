# NORMAL-07 · Unified `precision.amount` is `0` on perps whose lot is 10 or 100, so it doesn't describe the size grid
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified market metadata (`precisionFromStep`) |
| **Affects** | 1000PEPE-PERP (lot 100), PUMP-PERP (lot 100), DOGE-PERP (lot 10) |
| **Reproduce** | `npx tsx repro/07-unified-amount-precision.ts` |
| **Evidence** | [`evidence/07-unified-amount-precision.log`](../evidence/07-unified-amount-precision.log), [`evidence/code/07-sdk-dist_unified_structs_js.txt`](../evidence/code/07-sdk-dist_unified_structs_js.txt) |

## Summary

`precisionFromStep(step, decimals)` converts a lot size into a count of decimal places and clamps it at `0` (`Math.max(0, places)`). For lots of 10 or 100 units it returns `0`, which under the ccxt DECIMAL_PLACES convention means "any whole number". Consumers that round with `market.precision.amount` (order forms, charting libraries, clients in other languages, ccxt-style code) produce amounts that aren't on the lot grid. The SDK's own `amountToPrecision` uses the real lot and returns a different answer, so the metadata and the helper disagree.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 07-unified-amount-precision.ts`
3. The script compares `precision.amount` with the raw `lotSize` for all 21 perp markets, then calls `amountToPrecision(symbol, 2750)` on the affected ones.

## Expected

`precision` describes the grid: either ccxt's TICK_SIZE mode (`precision.amount = 100`), a negative decimal count (`-2`), or a documented `limits.amount.step` / lot field alongside it.

## Actual

```
symbol                 precision.amount  lotSize  amount grid implied by precision  matches?
1000PEPE/USDso:USDso   0                 100      1                                  NO
PUMP/USDso:USDso       0                 100      1                                  NO
DOGE/USDso:USDso       0                 10       1                                  NO
amountToPrecision("1000PEPE/USDso:USDso", 2750) = 2700  (precision.amount says 2750 is already valid)
```

The other 18 markets match.

## Evidence

- Log: [`evidence/07-unified-amount-precision.log`](../evidence/07-unified-amount-precision.log)
- Source: [`evidence/code/07-sdk-dist_unified_structs_js.txt`](../evidence/code/07-sdk-dist_unified_structs_js.txt) (`dist/unified/structs.js` lines 189-200)

## Impact

Off-grid sizes from UIs and third-party clients on three markets. `createOrder` silently floors them, so users get a smaller order than they entered without being told.

## Suggested fix

Don't clamp at zero (allow negative precision), switch the unified layer to TICK_SIZE precision, or expose the lot explicitly as `limits.amount.step` and document it.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, no wallet.
