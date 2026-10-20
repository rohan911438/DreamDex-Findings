# NORMAL-22 · Docs say no backstop bidders are registered on testnet; the LiquidationEngine reports one
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | Trader docs, Margin & Liquidations → Liquidations |
| **Affects** | Traders estimating how liquidations escalate (and how soon ADL is reached) |
| **Reproduce** | `npx tsx repro/22-backstop-bidders.ts` (read-only) |
| **Evidence** | [`evidence/22-backstop-bidders.log`](../evidence/22-backstop-bidders.log) |

## Summary

The Liquidations section ends with:

> No backstop bidders are registered on testnet, so the later stages come in sooner.

The LiquidationEngine wired to the perps MarginBank reports **`bidderCount: 1`**. The SDK docs call this field the operational signal for whether the takeover stage can run (*"`bidderCount === 0n` is itself operational — with no registered backstop bidders the takeover stage has nobody to take a position over"*).

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 22-backstop-bidders.ts`. This resolves the engine via `getPerpSystemConfig(marginBank)` and reads `getLiquidationEngineConfig(engine)`.

## Expected

Per the docs: `bidderCount` is `0`.

## Actual

```
getPerpSystemConfig(0x478769e1…1394).liquidationEngine = 0xA66d3C24Ad4a389d863846905D8173e1017e9F4D
getLiquidationEngineConfig -> {"penaltyBps":"100","minSpreadBps":"50","maxSpreadBps":"500","maxVolumePerBlock":"100000000000000000000000","bidderCount":"1"}
```

(`penaltyBps` 100 matches the documented "up to 1%" fee.)

## Evidence

- Log: [`evidence/22-backstop-bidders.log`](../evidence/22-backstop-bidders.log)

## Suggested fix

Update the sentence (for example "One backstop bidder is registered on testnet"), or generate it from `bidderCount`.

## Environment

Docs as of 2026-10-20 · LiquidationEngine `0xA66d3C24Ad4a389d863846905D8173e1017e9F4D` · Somnia Tokyo testnet (Hideki, chain 50383) · read-only.
