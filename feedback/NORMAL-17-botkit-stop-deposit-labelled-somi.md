# NORMAL-17 · Bot kit tells testnet users their stop orders lock "SOMI"; on the perps testnet the deposit is STT
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | dreamdex-bot-kit `strategies/perp-starter/src/index.ts`, `packages/perp-core/src/stops.ts` @ `2579866` |
| **Affects** | Every user of `perp-starter` / the stop helpers. Perps are testnet-only, so every place these strings print is a testnet |
| **Reproduce** | Source excerpt (below), or a dry run of `perp-starter` |
| **Evidence** | [`evidence/code/17-kit-strategies_perp-starter_src_index_ts.txt`](../evidence/code/17-kit-strategies_perp-starter_src_index_ts.txt), [`evidence/code/17-kit-packages_perp-core_src_stops_ts.txt`](../evidence/code/17-kit-packages_perp-core_src_stops_ts.txt) |

## Summary

On the perps testnet (Hideki) the gas coin, which is also what each pending TP/SL locks, is **STT**. The traders' docs say *"0.15 STT held per pending TP or SL"*, and the developer docs say *"Stop orders carry 0.15 STT each"*. The bot kit hard-codes **SOMI**, the mainnet coin, in the messages users read:

| Location | Text |
|---|---|
| `strategies/perp-starter/src/index.ts:100` | ``each pending stop locks ${…} SOMI, refunded on cancel; a bracket needs two.`` |
| `packages/perp-core/src/stops.ts:81` (dry run) | ``… whole position, 0.30 SOMI locked`` |
| `packages/perp-core/src/stops.ts:128` | ``[dry-run] would cancel … and reclaim their SOMI`` |
| `packages/perp-core/src/stops.ts:132` | ``cancelled … stop order(s), SOMI refunded`` |

The kit refuses `NETWORK=mainnet` for perps, so these lines only ever print on a testnet where the coin is STT. The kit's own `makeChain()` already sets `STT` as the native symbol for non-mainnet chains.

## Steps to reproduce

1. In the bot kit at `2579866`, run `perp-starter` with `NETWORK=hideki DRY_RUN=true PRIVATE_KEY=<any testnet key>` and read the stop-deposit and dry-run bracket lines, **or**
2. `grep -n "SOMI" strategies/perp-starter/src/index.ts packages/perp-core/src/stops.ts`

## Expected

The chain's native symbol: "each pending stop locks 0.15 STT", "0.30 STT locked", "STT refunded".

## Actual

"locks 0.15 SOMI", "0.30 SOMI locked", "SOMI refunded".

## Evidence

- [`evidence/code/17-kit-strategies_perp-starter_src_index_ts.txt`](../evidence/code/17-kit-strategies_perp-starter_src_index_ts.txt) ([permalink L97-101](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L97-L101))
- [`evidence/code/17-kit-packages_perp-core_src_stops_ts.txt`](../evidence/code/17-kit-packages_perp-core_src_stops_ts.txt) (L12-17, L78-83, L125-133)

## Impact

New users check, or try to buy, a SOMI balance before arming stops, because the bot's own log tells them to. Small, but it's the first message the starter bot prints about stops.

## Suggested fix

Print `chain.nativeCurrency.symbol` (already available via `makeChain(cfg)`) instead of the literal `SOMI`.

## Environment

Bot kit `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4` · Somnia Tokyo testnet (Hideki, chain 50383).
