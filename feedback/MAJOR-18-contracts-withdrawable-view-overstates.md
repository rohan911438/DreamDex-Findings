# MAJOR-18 · `MarginBank.getWithdrawableCollateral` (SDK `withdrawable`) overstates what can be withdrawn by up to 5.5×; withdrawing it reverts
Severity: major
Area: contracts

| | |
|---|---|
| **Component** | `MarginBank.getWithdrawableCollateral(address)` on Hideki (`0x478769E1177C0773c43A593DCCc4Ad15F15F1394`); surfaced as `getMarginAccount().withdrawable` in `@somnia-chain/markets-sdk` 0.32.1 |
| **Affects** | Every account with open positions or resting orders (4 of 4 tested). Any integrator that offers "Max withdraw" from this value |
| **Reproduce** | `npx tsx repro/18-withdrawable-view-overstates.ts` (read-only) |
| **Evidence** | [`evidence/18-withdrawable-view-overstates.log`](../evidence/18-withdrawable-view-overstates.log) |

## Summary

`getWithdrawableCollateral` is the MarginBank's view of how much an account can withdraw, and the SDK returns it unchanged as `getMarginAccount().withdrawable`. For accounts with open positions it doesn't match what `withdraw()` enforces:

- the view returns roughly the **unlocked collateral balance**, ignoring unrealized PnL and the initial-margin requirement of open positions;
- `withdraw()` correctly enforces margin after the withdrawal (`InsufficientMarginAfterWithdrawal`) and equity (`InsufficientCollateral`).

So the view overstates the withdrawable amount, sometimes above the account's **total equity**, and withdrawing exactly the amount it returns reverts. Funds are safe, because `withdraw()` enforces the real rule, but the protocol's own "how much can I withdraw" read is wrong for anyone with a position.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 18-withdrawable-view-overstates.ts [accounts]` (defaults to four public accounts with open positions)
3. For each account, at **one pinned block**, the script:
   1. reads `getWithdrawableCollateral(account)` and `getAccountHealth` (equity, initial margin);
   2. `eth_call`s `MarginBank.withdraw(view)` from the account;
   3. binary-searches the largest amount `withdraw()` accepts, in 0.000001 USDso steps.

## Expected

`getWithdrawableCollateral(account)` returns an amount that `withdraw()` accepts, ideally the largest such amount, and never more than the account's equity.

## Actual

| Account | Equity | View (`withdrawable`) | `withdraw(view)` | Largest accepted | View ÷ true |
|---|---|---|---|---|---|
| `0x4753…8bfF` | 550,355.86 | 553,227.72 | `InsufficientMarginAfterWithdrawal()` | 100,633.84 | **5.50×** |
| `0x85C6…a831` | 679,001.96 | 676,365.97 | `InsufficientCollateral()` | 307,771.54 | 2.20× |
| `0x4206…Dfd1` | 611,668.03 | 607,628.92 | `InsufficientMarginAfterWithdrawal()` | 554,761.75 | 1.10× |
| `0xDF19…20d7` | **25.97** | **28.46** (more than equity) | `InsufficientCollateral()` | 22.47 | 1.27× |

The view equals the unlocked collateral balance in each case (for example `0xDF19…`: unlocked 28.456890 = view 28.456890), even when unrealized losses have pushed equity below it.

## Evidence

- Log with block numbers, the SDK's `withdrawable`, `imReq`, unlocked and locked balances: [`evidence/18-withdrawable-view-overstates.log`](../evidence/18-withdrawable-view-overstates.log)
- The official app does **not** use the raw view. Its bundle caps it with `min(view, 99% × (equity − imReq))` (`perpWithdrawableCeiling`, see [`evidence/code/19-app-perpWithdrawableCeiling.txt`](../evidence/code/19-app-perpWithdrawableCeiling.txt)), which suggests the gap is known internally. The SDK passes the raw view through as `withdrawable` with no caveat and offers no corrected helper.

## Impact

- Any wallet, dashboard or bot that offers "withdraw max" from the documented read sends a withdrawal that reverts, by up to 5.5× on active accounts.
- Risk dashboards that treat `withdrawable` as free capital overstate it, in one case above total equity.

## Root cause

The view reports collateral not locked by resting orders, while `withdraw()` checks post-withdrawal equity (including unrealized PnL and funding) against the initial-margin requirement and the paper-USDso credit floor (see NORMAL-19).

## Suggested fix

Make `getWithdrawableCollateral` return `max(0, min(unlocked, equity − imReq − creditFloorTerm))`, the same rule `withdraw()` enforces. Until then, have the SDK compute the corrected value (as the app does), or rename the field and document that it's an upper bound.

## Environment

- Contract: MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` on Somnia Tokyo testnet (Hideki, chain 50383)
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Wallet: none; `eth_call` from public accounts, pinned to the block in each log row
