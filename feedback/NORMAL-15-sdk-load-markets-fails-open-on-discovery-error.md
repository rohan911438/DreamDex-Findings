# NORMAL-15 · `loadMarkets` fails open: when pool status discovery fails, every perp market is still `active: true`
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified `loadMarkets` (perp discovery) |
| **Affects** | Any consumer that filters markets on `active`; independent of the bot kit |
| **Reproduce** | `npx tsx repro/15-load-markets-fails-open.ts` (read-only) |
| **Evidence** | [`evidence/15-load-markets-fails-open.log`](../evidence/15-load-markets-fails-open.log) |

## Summary

A perp market's unified `active` flag is meant to reflect the pool's own status (`restricted`, `registered`, `tradeable`), read through the perp pool factory during `loadMarkets()`. When that read fails, the SDK records the error in `exchange.perpDiscoveryError`, leaves `perpStatus` undefined, and still reports **`active: true`** for every perp market. Code that does the natural thing (`Object.values(markets).filter(m => m.active)`) treats an unknown status as "tradeable", and nothing is thrown or logged.

This is the SDK-side half of MAJOR-03, where a wrong factory address triggers it. An RPC failure during discovery triggers it the same way.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 15-load-markets-fails-open.ts`. This uses the **correct** `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, then the same set with `perpPoolFactory` pointed at an address with no code, standing in for any failed status read.

## Expected

When the status can't be read, `active` is `undefined` or `false` (or `loadMarkets` rejects), so consumers don't trade on an unknown status.

## Actual

```
== control: SOMNIA_HIDEKI_TESTNET_ADDRESSES
  perp markets: 21, active: 21, with perpStatus: 21
  perpDiscoveryError: null

== same set, perpPoolFactory unreadable
  perp markets: 21, active: 21, with perpStatus: 0
  perpDiscoveryError: … rpc readContract getPerpPools failed: The contract function "getPerpPools" returned no data ("0x").
```

## Evidence

- Log: [`evidence/15-load-markets-fails-open.log`](../evidence/15-load-markets-fails-open.log)
- SDK source: `dist/unified/exchange.js` (`loadEngineMarkets` / `discoverPerpPools`, around lines 1199-1240 and 1375-1420)

## Suggested fix

Fail closed: set `active` to `false` (or leave it `undefined` with a documented meaning) for perp markets whose status wasn't read, or reject `loadMarkets` when perp discovery fails on a chain that has perp rows.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, no wallet.
