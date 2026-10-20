# perp-starter "manages" an existing position but builds its TP/SL from PERP_SIDE, not the position's side
Severity: major
Area: SDK

When the account already has a position, `strategies/perp-starter/src/index.ts:123` logs `already <side> …, managing it instead of opening another`. It then computes the take-profit and stop-loss from the configured `PERP_SIDE` (default `long`, lines 176-177) and arms the bracket with `position: SIDE` (line 187). It never uses `existing.side`. If the position is on the other side:

- **Own-key mode (stop registry):** the bracket is two reduce-only orders on the wrong side. The registry rejects it with `NoReducingPositionAtCreation()`, the bot exits with an error, and the position it said it was managing is left with **no** TP/SL.
- **Trading-key mode (`OWNER_ADDRESS`, exits watched by the bot, lines 224-225):** the levels are swapped. For a short with `PERP_SIDE=long`, "take-profit" fires at **+2%** (closing the short at a 2% loss) and "stop-loss" fires at **-1%** (closing it in profit). The logs label them the other way round.

## Steps to reproduce
1. `cd repro && npm install`
2. `npx tsx 05-perp-starter-wrong-side-bracket.ts`
   It finds a real account that is SHORT BTC and has already approved the BTC stop registry, then `eth_call`s (a) the correct short bracket and (b) the bracket `armBracket({ position: "long" })` builds. The calldata is built as that owner through an address-only wallet client; nothing is signed.
3. To see the bot itself: hold a short on ETH-PERP, run `perp-starter` with `PERP_SYMBOL=ETH-PERP DRY_RUN=false` and no `PERP_SIDE`.

## Expected
The bot takes the side from the existing position (or refuses to start when `PERP_SIDE` disagrees with it) and arms a bracket that protects that position.

## Actual
```
owner 0x13fe00d92abaee7db424028b785b42b8926913b0, BTC position -32244000 raw (negative = SHORT)
correct bracket for the short   (buy legs, TP <= -1%, SL >= +2%): ACCEPTED (would arm)
perp-starter with PERP_SIDE=long (sell legs, TP >= +2%, SL <= -1%): REJECTED NoReducingPositionAtCreation()
```

## Impact
`perp-starter` is the kit's entry-point example. Restarting it after a manual trade, or running it on an account with a position from the app, either leaves the position unprotected after a crash or, with a trading key, closes losers as "take-profit" and winners as "stop-loss".

## Suggested fix
After `positionIn()`, set the side used for levels and `armBracket` from `existing.side`, or exit with a clear message when it differs from `PERP_SIDE`.

## Evidence
- `evidence/05-perp-starter-wrong-side-bracket.txt`
- Code: `dreamdex-bot-kit/strategies/perp-starter/src/index.ts:121-124, 173-188, 221-227`

## Environment
dreamdex-bot-kit `main` @ `2579866`, SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). BTC stop registry `0x52e2ccebaec9332672c247e9a90aa3d61fb615ef`, OperatorPermissionsRegistry `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a`. Read-only simulation.
