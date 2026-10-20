# Bot kit uses the Shannon address set on Hideki: perp status discovery fails silently, halted markets look tradeable
Severity: major
Area: SDK

`packages/perp-core/src/exchange.ts:56` (dreamdex-bot-kit `2579866`) builds every perp bot's exchange with `addresses: SOMNIA_TESTNET_ADDRESSES`, the **Shannon** (chain 50312) set. The comment above it (line 37) says "The bundled testnet address set serves Hideki too: the singletons … sit at the same deterministic addresses there". That's false: `collateral`, `marginBank`, `perpPoolFactory`, `marketCreator` and `priceFeedScheduler` all differ, and the docs say to use `SOMNIA_HIDEKI_TESTNET_ADDRESSES`.

The SDK's `loadMarkets` uses `addresses.perpPoolFactory` to read each pool's status (`restricted` / `registered` / `tradeable`). On Hideki the Shannon factory address has no code, so that read fails. The failure lands only in `exchange.perpDiscoveryError`, which the kit never checks, and every market keeps `active: true` with no `perpStatus`.

The kit filters markets on exactly that flag (`packages/perp-core/src/markets.ts:94`: "`active` is derived from the pool's own gates, so an inactive market is one the venue has stopped"). With this config a halted or close-only market is still treated as live.

## Steps to reproduce
1. `cd repro && npm install`
2. `npx tsx 04-botkit-wrong-address-set.ts` (builds the exchange exactly like `createExchange()` for `NETWORK=hideki`, then with the documented set)

## Expected
Perp discovery succeeds and every market carries `perpStatus`. A restricted or untradeable pool shows `active: false`.

## Actual
```
perpPoolFactory   0x516d2cb6…  (bot kit)   vs 0xE631fAEE… (Hideki)   <-- differs  (also collateral, marginBank, marketCreator, priceFeedScheduler)

== bot kit: SOMNIA_TESTNET_ADDRESSES
  perpPoolFactory 0x516d2cb6de41bE98444e887793946E65989Ba07b has code on Hideki: NO
  perp markets 21, active 21, with perpStatus 0
  exchange.perpDiscoveryError: rpc readContract getPerpPools failed: The contract function "getPerpPools" returned no data ("0x").

== docs: SOMNIA_HIDEKI_TESTNET_ADDRESSES
  perp markets 21, active 21, with perpStatus 21
  BTC/USDso:USDso perpStatus={"restricted":false,"registered":true,"tradeable":true}
```

## Impact
All four `perp-*` strategies (starter, maker, funding, guard) run blind to venue halts and close-only mode on Hideki. They also make a failing RPC call on every `loadMarkets(true)`, which `perp-maker` and `perp-starter` run every cycle.

## Suggested fix
Pick the address set by network in `createExchange()` (`SOMNIA_HIDEKI_TESTNET_ADDRESSES` for `hideki`), fix the comment, and fail fast when `perpDiscoveryError` is set.

## Evidence
- `evidence/04-botkit-wrong-address-set.txt`
- Code: `dreamdex-bot-kit/packages/perp-core/src/exchange.ts:37-56`, `packages/perp-core/src/markets.ts:80-94`

## Environment
dreamdex-bot-kit `main` @ `2579866`, SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only, no wallet needed.
