# MAJOR-04 · `perp-starter` "manages" an existing position but builds its TP/SL from `PERP_SIDE`, not the position's side
Severity: major
Area: SDK

| | |
|---|---|
| **Component** | dreamdex-bot-kit `strategies/perp-starter` @ `2579866` (with `packages/perp-core/src/stops.ts`) |
| **Affects** | Any run where the account already holds a position on the side opposite to `PERP_SIDE` (default `long`) |
| **Reproduce** | `npx tsx repro/04-perp-starter-wrong-side-bracket.ts` (read-only simulation) |
| **Evidence** | [`evidence/04-perp-starter-wrong-side-bracket.log`](../evidence/04-perp-starter-wrong-side-bracket.log), [`evidence/code/04-kit-strategies_perp-starter_src_index_ts.txt`](../evidence/code/04-kit-strategies_perp-starter_src_index_ts.txt) |

## Summary

When the account already has a position, `perp-starter` logs `already <side> …, managing it instead of opening another` (line 123). It then derives the take-profit and stop-loss from the configured `SIDE` (lines 176-177) and arms the bracket with `position: SIDE` (line 187), never consulting `existing.side`. When the two differ:

- **Own-key mode (stop registry).** The bracket is two reduce-only orders on the wrong side. The registry rejects it with `NoReducingPositionAtCreation()`, `main()` exits with an error, and the position it said it would manage is left **without any TP/SL**.
- **Trading-key mode (`OWNER_ADDRESS`; exits watched by the bot, lines 224-225).** The levels are mirrored. For a short with `PERP_SIDE=long`, "take-profit" fires at **mark + 2 %** and closes the short at a **loss**, and "stop-loss" fires at **mark − 1 %** and closes it in **profit**. The log lines label each exit the other way round.

## Steps to reproduce

**A. Simulation (no funds needed)**

1. `cd repro && npm install`
2. `npx tsx 04-perp-starter-wrong-side-bracket.ts`
3. The script finds a public account that is currently **short BTC-PERP** and has already approved the BTC stop registry (it has used stops). It builds two linked stop pairs **as that owner**, through an address-only wallet client that holds no key, and `eth_call`s each:
   - the correct bracket for a short (buy legs; TP ≤ mark − 1 %, SL ≥ mark + 2 %);
   - the bracket `armBracket({ position: "long" })` produces with perp-starter's defaults (sell legs; TP ≥ mark + 2 %, SL ≤ mark − 1 %).

**B. With the bot (testnet funds)**

1. Open a short on ETH-PERP from the app.
2. Run `perp-starter` with `PERP_SYMBOL=ETH-PERP DRY_RUN=false` and no `PERP_SIDE`.
3. The bot prints `already short … managing it`, then fails on `armBracket`; the short has no bracket.

## Expected

The bot protects the position it says it's managing: it takes the bracket side from `existing.side`, or refuses to start with a clear message when `PERP_SIDE` contradicts the open position.

## Actual

```
owner 0x7185…a71f, BTC position -36674000 raw (negative = SHORT), mark 81372.20
correct bracket for the short   (buy legs, TP <= -1%, SL >= +2%): ACCEPTED (would arm)
perp-starter with PERP_SIDE=long (sell legs, TP >= +2%, SL <= -1%): REJECTED NoReducingPositionAtCreation()
```

(Exact owner, mark and block in the evidence log.)

## Evidence

- Log: [`evidence/04-perp-starter-wrong-side-bracket.log`](../evidence/04-perp-starter-wrong-side-bracket.log)
- Source: [`evidence/code/04-kit-strategies_perp-starter_src_index_ts.txt`](../evidence/code/04-kit-strategies_perp-starter_src_index_ts.txt), lines 119-125 (existing position adopted), 170-188 (levels and bracket from `SIDE`), 218-228 (watched exits from `SIDE`). [Permalink](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L119-L228)

## Impact

`perp-starter` is the kit's entry-point perp example. Restarting it after a manual trade, or running it against an account that already trades in the app, is a normal thing to do. The result is either an unprotected position after an error exit, or (with a trading key) exits that realise losses as "take-profit" and cut winners as "stop-loss".

## Root cause

`SIDE` is computed once from the environment at module load and used for both opening and managing. The branch that adopts an existing position doesn't override it.

## Suggested fix

After `positionIn()`, use `existing.side` for the level calculation, `armBracket` and the watched-exit comparisons, or `process.exit(1)` with "account holds a short but PERP_SIDE=long". A unit test with an opposite-side position would cover it.

## Environment

- Bot kit: `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4`
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet (Hideki, chain 50383). BTC stop registry `0x52e2ccebaec9332672c247e9a90aa3d61fb615ef`; OperatorPermissionsRegistry `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a`
- Wallet: none; `eth_call` only
