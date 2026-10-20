# NORMAL-21 · Docs say a paper-USDso account's leverage "can't be changed"; `setMaxLeverage` succeeds
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | Trader docs, Margin & Liquidations → Paper USDso |
| **Affects** | Perps Arena participants |
| **Reproduce** | `npx tsx repro/21-paper-usdso-leverage-change.ts` (read-only) |
| **Evidence** | [`evidence/21-paper-usdso-leverage-change.log`](../evidence/21-paper-usdso-leverage-change.log) |

## Summary

The Paper USDso rules on the Margin & Liquidations page include:

> **Your leverage setting can't be changed** while it remains.

On chain, `MarginBank.setMaxLeverage(pool, x)` succeeds for accounts holding paper USDso, both raising and lowering, on every market tested, including setting it for the first time.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 21-paper-usdso-leverage-change.ts [accounts]`. For two public accounts with a 2,000 USDso credit floor, the script `eth_call`s `setMaxLeverage` on BTC, ADA and ETH at 2x, market max − 1 and market max.

## Expected

Per the docs: `setMaxLeverage` reverts while the account holds paper USDso.

## Actual

```
0x021B…dbb1 BTC  paper USDso 2000 | current 6     | market max 20x | setMaxLeverage: 2x OK, 19x OK, 20x OK
0x021B…dbb1 ADA  paper USDso 2000 | current unset | market max 10x | setMaxLeverage: 2x OK, 9x OK, 10x OK
0x6328…3179 BTC  paper USDso 2000 | current unset | market max 20x | setMaxLeverage: 2x OK, 19x OK, 20x OK
```

(6 of 6 combinations, 18 of 18 calls accepted.)

## Evidence

- Log: [`evidence/21-paper-usdso-leverage-change.log`](../evidence/21-paper-usdso-leverage-change.log)

## Suggested fix

Correct the docs to the actual rule. The SDK describes a voucher **leverage cap** (`voucherLeverageCapX`, 20 on these accounts) that applies to position increases, which is different from the setting being frozen. Or enforce the freeze if that's the intended behaviour.

## Environment

Docs as of 2026-10-20 · MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` · Somnia Tokyo testnet (Hideki, chain 50383) · read-only `eth_call`.
