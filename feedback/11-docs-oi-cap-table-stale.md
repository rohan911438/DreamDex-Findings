# Docs: market table's open interest caps are wrong on 20 of 21 markets, and the "a tenth per account" rule holds on 1
Severity: normal
Area: docs

`/docs/trading/perps-testnet` → "Markets" says "These figures are read from the live markets". The **Open interest cap** column doesn't match on-chain `maxOpenInterest` on 20 of 21 markets: the live caps are 2x (BTC, ETH, SOL, HYPE) or 4x (most others) the documented values. Only TAO matches. Reading the table, a trader would think BTC (286 BTC open) and XRP (610k open) are already over their caps.

The same page and the developer page ("Common pitfalls") say "A single account is capped at a tenth of it on most markets". On chain, `maxPositionSize / maxOpenInterest` is 10% on **one** market (TAO). It's 5% on 12, 2.5% on 6, 20.3% on BTC and 25% on ZEC.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 07-oi-caps-vs-docs.ts` (docs values copied into the script, compared with `client.getPerpRiskParams(pool)`)

## Expected
The table matches the live caps (or is generated from them), and the per-account rule is stated as it is.

## Actual (excerpt)
```
market   docs OI cap   on-chain maxOpenInterest  chain/docs  maxPositionSize  per-account share
BTC      246.81545     493.6309                  2.00        100              20.3%
ETH      3995.6125     7991.225                  2.00        399.5612         5.0%
XRP      344632        1378528                   4.00        68926.4          5.0%
ZEC      420           1680                      4.00        420              25.0%
TAO      2185.491      2185.491                  1.00        218.549          10.0%
20 of 21 markets: docs OI cap != on-chain maxOpenInterest
1 of 21 markets: per-account cap is exactly a tenth of the OI cap
```
Margins, ticks, minimum sizes and base decimals in the same tables **do** match the chain.

## Evidence
`evidence/07-oi-caps-vs-docs.txt`

## Environment
Docs pages as of 2026-10-20. SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only.
