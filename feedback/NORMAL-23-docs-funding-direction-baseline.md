# NORMAL-23 · Funding docs say a perp below the index means shorts pay; longs pay on most markets because of an undocumented +0.01%/8h baseline
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | Trader docs, `/docs/trading/perps-testnet/funding` → "Who pays whom" |
| **Affects** | Traders and carry strategies predicting the sign of funding |
| **Reproduce** | `npx tsx repro/23-funding-direction-vs-docs.ts` (read-only) |
| **Evidence** | [`evidence/23-funding-direction-vs-docs.log`](../evidence/23-funding-direction-vs-docs.log) |

## Summary

The funding page states the rule as:

> - **Perp above the index** (positive funding): longs pay shorts.
> - **Perp below the index** (negative funding): shorts pay longs.

On the live markets the rate sits at exactly **+0.0100% per 8 h** on 17 of 21 markets. On **8 markets where both the mark and the book mid are below the index**, funding is still positive, so longs pay. ETH's history shows the same: six consecutive hourly settlements with mark about 0.04% below index, each at +0.0100%. That pattern matches a premium-plus-interest-rate formula, where a small discount is outweighed by a positive baseline. The page doesn't mention a baseline, a clamp, or which "perp price" (mark, mid, impact price) the premium is measured from.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 23-funding-direction-vs-docs.ts`. For every market this prints the mark and book-mid premium to the index, the live funding rate (`fetchFundingRate`), and what the documented rule predicts, followed by ETH's recent `fetchFundingRateHistory`.

## Expected

Either the rule holds (perp below index ⇒ negative funding), or the docs explain the formula: the baseline rate, the clamp, and the price used for the premium.

## Actual

```
market     mark-index   bookmid-index   funding/8h    longs pay?   rule says
ADA          -0.068%      -0.053%       0.0100%    yes         shorts pay
AVAX         -0.062%      -0.045%       0.0100%    yes         shorts pay
LINK         -0.051%      -0.061%       0.0100%    yes         shorts pay
WLD          -0.062%      -0.078%       0.0100%    yes         shorts pay
XRP          -0.045%      -0.039%       0.0100%    yes         shorts pay
…
markets where BOTH mark and book mid are below index yet funding is positive (longs pay): 8 of 21
markets at exactly +0.0100% per 8h: 17 of 21

ETH funding history:
  2026-10-19T14:19:18Z  mark 2394.9718  index 2395.9312  (-0.040%)  funding 0.0100%
  2026-10-19T15:19:18Z  mark 2407.6498  index 2408.6484  (-0.041%)  funding 0.0100%
  …
```

## Evidence

- Log with all 21 markets and the ETH history: [`evidence/23-funding-direction-vs-docs.log`](../evidence/23-funding-direction-vs-docs.log)

## Impact

A trader following the page will think a short at a small discount gets paid, when it pays. A carry strategy keyed on the documented rule picks the wrong side. The bot kit's `perp-funding` reads the sign of the rate itself and is unaffected.

## Suggested fix

Document the actual formula: the baseline interest component (+0.01% per 8 h), any clamp on the premium term, and the price used. Restate the rule as "positive funding: longs pay; negative: shorts pay; the rate is premium + baseline, so a small discount can still be positive."

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only.
