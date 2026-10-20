# MAJOR-03 · Bot kit builds Hideki clients with the Shannon address set: pool status discovery fails silently and halted markets look tradeable
Severity: major
Area: SDK

| | |
|---|---|
| **Component** | dreamdex-bot-kit `packages/perp-core/src/exchange.ts` (`createExchange`) @ `2579866` |
| **Affects** | All four perp strategies (`perp-starter`, `perp-maker`, `perp-funding`, `perp-guard`) on `NETWORK=hideki`, the default and the network Perps Arena runs on |
| **Reproduce** | `npx tsx repro/03-botkit-wrong-address-set.ts` (read-only) |
| **Evidence** | [`evidence/03-botkit-wrong-address-set.log`](../evidence/03-botkit-wrong-address-set.log), [`evidence/code/03-kit-packages_perp-core_src_exchange_ts.txt`](../evidence/code/03-kit-packages_perp-core_src_exchange_ts.txt), [`evidence/code/03-kit-packages_perp-core_src_markets_ts.txt`](../evidence/code/03-kit-packages_perp-core_src_markets_ts.txt) |

## Summary

`createExchange()` passes `addresses: SOMNIA_TESTNET_ADDRESSES` (line 56) for every network, including Hideki. That constant is the **Shannon** testnet set (chain 50312). The comment above it (line 37) states the assumption:

> The bundled testnet address set serves Hideki too: the singletons the SDK looks up sit at the same deterministic addresses there …

That's not true. Five entries differ, including `perpPoolFactory`, and the developer docs say to use `SOMNIA_HIDEKI_TESTNET_ADDRESSES`.

The SDK's `loadMarkets()` calls `addresses.perpPoolFactory` → `getPerpPools` to read each pool's status (`restricted`, `registered`, `tradeable`). On Hideki the Shannon factory address holds **no code**, so the read fails. The SDK stores the failure in `exchange.perpDiscoveryError`, which the kit never checks, and every perp market keeps `active: true` with no `perpStatus` (see NORMAL-15).

The kit relies on that flag for safety (`markets.ts` lines 80-94):

> `active` is derived from the pool's own gates, so an inactive market is one the venue has stopped …
> `.filter((m) => m.type === "swap" && (opts.includeHalted || m.active))`

With this configuration a halted or close-only market is still treated as live.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 03-botkit-wrong-address-set.ts`
3. The script builds a `SomniaMarkets` exchange exactly as `createExchange()` does for `NETWORK=hideki` (same chain definition, `SOMNIA_TESTNET_ADDRESSES`), calls `loadMarkets(true)`, and repeats with the documented `SOMNIA_HIDEKI_TESTNET_ADDRESSES`.

## Expected

On Hideki the kit uses the Hideki address set: perp discovery succeeds, every market carries `perpStatus`, and a restricted or untradeable pool is `active: false`.

## Actual

```
key                  SOMNIA_TESTNET_ADDRESSES (bot kit)          SOMNIA_HIDEKI_TESTNET_ADDRESSES (docs)
collateral           0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E   0x9E9492cC533E8696A3b6afC7df730800DF75148f   <-- differs
marginBank           0xdd4A14A2763FDa39b9759D2D4150DB0e0f085C4E   0x478769E1177C0773c43A593DCCc4Ad15F15F1394   <-- differs
perpPoolFactory      0x516d2cb6de41bE98444e887793946E65989Ba07b   0xE631fAEE547baeE07353E290f0562ea67d856560   <-- differs
marketCreator        0xD584e651008538b5C6B1C777cD4fbD54cC19a291   0xAd890D6Ac3c659E1Ed0fA72Cf557DB4cA26bdAff   <-- differs
priceFeedScheduler   0x7ccAE31E45693475be1e4BAa2360D6997eB2D32B   0x1998C88D54a240b8C671493f27f58eC416b81D7F   <-- differs

== bot kit: SOMNIA_TESTNET_ADDRESSES
  perpPoolFactory 0x516d2cb6de41bE98444e887793946E65989Ba07b has code on Hideki: NO
  perp markets 21, active 21, with perpStatus 0
  BTC/USDso:USDso active=true perpStatus=undefined
  exchange.perpDiscoveryError: … rpc readContract getPerpPools failed: The contract function "getPerpPools" returned no data ("0x").

== docs:    SOMNIA_HIDEKI_TESTNET_ADDRESSES
  perpPoolFactory 0xE631fAEE547baeE07353E290f0562ea67d856560 has code on Hideki: yes
  perp markets 21, active 21, with perpStatus 21
  BTC/USDso:USDso active=true perpStatus={"restricted":false,"registered":true,"tradeable":true}
```

## Evidence

- Log: [`evidence/03-botkit-wrong-address-set.log`](../evidence/03-botkit-wrong-address-set.log)
- Source:
  - [`perp-core/src/exchange.ts` L33-58](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/exchange.ts#L33-L58) (comment and `SOMNIA_TESTNET_ADDRESSES`)
  - [`perp-core/src/markets.ts` L76-95](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/markets.ts#L76-L95) (`active` relied on as the halt signal)
- Developer docs, `/docs/developers/perps-testnet` → "Connect": `addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES`

## Impact

- Every perp bot built from the kit is blind to venue halts and close-only mode on Hideki. `perp-maker` and `perp-starter` keep quoting or opening into a stopped market instead of standing aside.
- Every `loadMarkets(true)`, which `perp-maker` and `perp-starter` run each cycle, makes a failing RPC call.
- Builders who copy the kit inherit the wrong constant, and the code comment tells them it's correct.

## Root cause

A single address set is hard-coded for all test networks on the assumption that the singletons are deployed deterministically at identical addresses. They aren't.

## Suggested fix

Select the set by network in `createExchange()` (`hideki` → `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, `testnet` → `SOMNIA_TESTNET_ADDRESSES`), correct the comment, and fail fast at startup when `exchange.perpDiscoveryError` is set.

## Environment

- Bot kit: `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4`
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet (Hideki, chain 50383)
- Wallet: none; read-only
