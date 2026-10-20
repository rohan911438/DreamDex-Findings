# Unified market precision.amount is 0 for perps whose lot is 10 or 100, so it no longer describes the size grid
Severity: normal
Area: SDK

`precisionFromStep` (`dist/unified/structs.js:193`) clamps decimal places at `0`. For lots of 10 or 100 units it reports `precision.amount: 0`, which in the ccxt DECIMAL_PLACES convention means "any whole number". Affected: 1000PEPE (lot 100), PUMP (lot 100), DOGE (lot 10). A consumer that rounds with `precision.amount` (charting UIs, ccxt-style order forms, other languages' clients) produces sizes like 2,750 1000PEPE that aren't on the grid. The SDK's own `amountToPrecision` uses the lot and gets 2,700, so the metadata and the helper disagree.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 06-unified-amount-precision.ts`

## Expected
`precision.amount` describes the amount grid. For example, use ccxt's TICK_SIZE convention (`precision.amount = 100`) or a negative decimal count (`-2`), or add `limits.amount.step` / `info.lotSize` as a documented field.

## Actual
```
1000PEPE/USDso:USDso   precision.amount 0   lotSize 100   implied grid 1   NO
PUMP/USDso:USDso       precision.amount 0   lotSize 100   implied grid 1   NO
DOGE/USDso:USDso       precision.amount 0   lotSize 10    implied grid 1   NO
amountToPrecision("1000PEPE/USDso:USDso", 2750) = 2700  (precision.amount says 2750 is already valid)
```

## Evidence
`evidence/06-unified-amount-precision.txt`; code `dist/unified/structs.js:193-200`, `dist/unified/exchange.js:1562-1565`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only.
