# NORMAL-24 · The Errors page the perps docs point to lists no perp, MarginBank or perp-stop errors
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | `/docs/developers/contracts/errors`; link from `/docs/developers/perps-testnet` |
| **Affects** | Developers decoding perp reverts |
| **Reproduce** | `npx tsx repro/24-errors-page-missing-perp-errors.ts` |
| **Evidence** | [`evidence/24-errors-page-missing-perp-errors.log`](../evidence/24-errors-page-missing-perp-errors.log) |

## Summary

The perps developer page says, in "An IOC that fills nothing reverts":

> The full list of order errors is on the [Errors](https://app.testnet.dreamdex.io/docs/developers/contracts/errors#order-rejection) page.

That page has sections for **SpotPool** and **SpotStopOrderRegistry** only. It has nothing for PerpPool, MarginBank, PerpStopOrderRegistry or LiquidationEngine. Every perp-specific revert hit during this review is missing from it, even though all of them are in the SDK's `contractErrorsAbi`. (The 58 selectors the page *does* list were checked against `keccak256` and are all correct.)

## Steps to reproduce

1. Open `/docs/developers/contracts/errors` and search for `MaxPositionSize`, `Margin`, `CreditFloor` or `FillPrice`. No results.
2. `cd repro && npm install && npx tsx 24-errors-page-missing-perp-errors.ts` prints each perp-path error with its selector, whether the SDK knows it, and whether the page lists it.

## Expected

A perps section listing PerpPool, MarginBank and PerpStopOrderRegistry errors with selectors and fixes, as the perps page promises.

## Actual

```
error                               selector     in SDK ABI  on Errors page
MaxPositionSizeExceeded             0x714b36d6   yes         NO
InsufficientMarginForOrder          0x7ea61260   yes         NO
FillPriceOutsideBand                0xec4b288c   yes         NO
InsufficientCollateral              0x3a23d825   yes         NO
IsolatedMarketBlocked               0xaa4fc774   yes         NO
NoReducingPositionAtCreation        0xd156c90a   yes         NO
RegistryNotApprovedByOwner          0x28e0a7ba   yes         NO
InsufficientMarginAfterWithdrawal   0x30c29a70   yes         NO
WithdrawalBelowCreditFloor          0x503d280d   yes         NO
9 of 9 perp-path errors are not on the Errors page
```

## Evidence

- Log: [`evidence/24-errors-page-missing-perp-errors.log`](../evidence/24-errors-page-missing-perp-errors.log)

## Suggested fix

Add "PerpPool errors", "MarginBank errors" and "PerpStopOrderRegistry errors" sections (selector, meaning, fix), generated from the same ABI the SDK ships.

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 (`contractErrorsAbi`).
