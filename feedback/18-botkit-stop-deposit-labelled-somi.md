# Bot kit tells testnet users their stop orders lock "SOMI"; on the perps testnet the deposit is STT
Severity: normal
Area: SDK

On the perps testnet (Hideki) the gas coin, and the deposit each pending TP/SL locks, is **STT**. The traders' docs say "0.15 STT held per pending TP or SL" and the developer docs say "Stop orders carry 0.15 STT each". The bot kit hard-codes **SOMI**, the mainnet coin, in what it prints to users:

- `strategies/perp-starter/src/index.ts:100`: `each pending stop locks ${…} SOMI, refunded on cancel; a bracket needs two.`
- `packages/perp-core/src/stops.ts:81` (dry-run): `… whole position, 0.30 SOMI locked`
- `stops.ts` header and `cancelStops` log: "SOMI refunded"

Perps are refused on mainnet by the kit itself (`NETWORK=mainnet` throws), so every place these lines print is a testnet where the coin is STT. A new user checking a SOMI balance before arming stops, or buying SOMI to "fund" them, is following the bot's own log.

## Steps to reproduce
1. In the bot kit (`2579866`), run `perp-starter` with `NETWORK=hideki DRY_RUN=true PRIVATE_KEY=<any testnet key>` and read the stop deposit line.
2. Or `grep -n "SOMI" strategies/perp-starter/src/index.ts packages/perp-core/src/stops.ts`.

## Expected
Use the chain's native symbol (the kit's `makeChain()` already sets `STT` for non-mainnet chains): "locks 0.15 STT".

## Actual
"locks 0.15 SOMI" / "0.30 SOMI locked" / "SOMI refunded".

## Environment
dreamdex-bot-kit `main` @ `2579866`. Network: Somnia Tokyo testnet (Hideki, chain 50383).
