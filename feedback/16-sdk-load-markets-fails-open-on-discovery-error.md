# loadMarkets fails open: when perp pool status discovery fails, every perp market is still reported active: true
Severity: normal
Area: SDK

The unified `active` flag on a perp market comes from the pool's status (`restricted` / `registered` / `tradeable`), read via the perp pool factory during `loadMarkets()`. When that read fails, the SDK records the error in `exchange.perpDiscoveryError`, leaves `perpStatus` undefined, and still returns **`active: true`** for every perp market. Code that does the natural thing (`markets.filter(m => m.active)`, as the bot kit does) treats a halted or close-only market as tradeable whenever discovery fails, and nothing is thrown or logged.

This is the SDK side of `04-botkit-shannon-addresses-on-hideki.md`. A wrong factory address is one trigger; an RPC error during discovery is another.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 04-botkit-wrong-address-set.ts`

## Expected
When status can't be read, `active` is `undefined`/`false` (or `loadMarkets` rejects), so consumers don't trade on an unknown status.

## Actual
```
perp markets 21, active 21, with perpStatus 0
BTC/USDso:USDso active=true perpStatus=undefined
exchange.perpDiscoveryError: rpc readContract getPerpPools failed: … returned no data ("0x")
```

## Evidence
`evidence/04-botkit-wrong-address-set.txt`; code `dist/unified/exchange.js:1199-1240, 1375-1420`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only.
