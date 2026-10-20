# NORMAL-20 · Docs say paper USDso can't open positions on six markets; on chain it can trade all 21
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | Trader docs (market table "Paper USDso" column; Margin & Liquidations → Paper USDso), developer docs ("Common pitfalls"), bot kit `voucherBlocked` messaging |
| **Affects** | Perps Arena participants and bot builders reasoning about the credit's restrictions |
| **Reproduce** | `npx tsx repro/20-paper-usdso-market-restriction.ts` (read-only) |
| **Evidence** | [`evidence/20-paper-usdso-market-restriction.log`](../evidence/20-paper-usdso-market-restriction.log) |

## Summary

The docs describe a market restriction on the Perps Arena credit in several places:

- Trader market table: **Paper USDso = No** for 1000PEPE, LIT, PUMP, VVV, ZEC, ZRO.
- Margin & Liquidations → Paper USDso: *"You can open or increase positions only in the markets marked Yes … The six newest markets are not on that list."*
- Developer docs, Common pitfalls: *"Paper USDso blocks some markets. Increasing a position in a market outside the credit's allowlist reverts, and `getMaxPerpOrderSize` reports it as `limitedBy: "voucherBlocked"`."*

On chain, `voucherMarketAllowed` is **true on all 21 markets** for paper-USDso accounts. Opening a position on every one of the six "No" markets succeeds, and some paper-USDso accounts already hold positions there.

Either the allowlist was widened and four documentation surfaces are stale, or the six markets were meant to stay excluded and the allowlist is misconfigured. This report doesn't assume which; both need action.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 20-paper-usdso-market-restriction.ts [accounts]`. For public paper-USDso accounts (credit floor > 0), the script reads `getPerpLeverage().voucherMarketAllowed` on every market and `eth_call`s a minimum-size resting bid on each of the six "No" markets.

## Expected

Per the docs: opening on 1000PEPE, LIT, PUMP, VVV, ZEC or ZRO reverts, and `voucherMarketAllowed` is false there.

## Actual

```
0x021B…dbb1: creditFloor 2000 USDso (paper USDso present: true)
  1000PEPE  docs: "No" | voucherMarketAllowed true | eth_call open (min size) -> OK
  LIT       docs: "No" | voucherMarketAllowed true | eth_call open (min size) -> OK
  PUMP      docs: "No" | voucherMarketAllowed true | eth_call open (min size) -> OK
  VVV       docs: "No" | voucherMarketAllowed true | eth_call open (min size) -> OK
  ZEC       docs: "No" | voucherMarketAllowed true | eth_call open (min size) -> OK
  ZRO       docs: "No" | voucherMarketAllowed true | current position 1074.6 ZRO | eth_call open (min size) -> OK
  voucherMarketAllowed = true on 21 of 21 markets
```

Same result for a second paper-USDso account (also holding ZRO).

## Evidence

- Log: [`evidence/20-paper-usdso-market-restriction.log`](../evidence/20-paper-usdso-market-restriction.log)

## Impact

- If the restriction is intended: Arena credit is trading markets it shouldn't, and the documented risk control isn't in force.
- If it's not: four surfaces mislead traders and developers, and bot code written around `voucherBlocked` (including the bot kit's messaging) handles a case that never occurs.

## Suggested fix

Confirm the intended allowlist. Then either restore the exclusion on chain, or update the market table, the Paper USDso section, the developer pitfall and the bot kit message.

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` · Somnia Tokyo testnet (Hideki, chain 50383) · read-only `eth_call`.
