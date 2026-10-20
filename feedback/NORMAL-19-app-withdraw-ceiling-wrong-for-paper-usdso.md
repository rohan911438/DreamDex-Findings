# NORMAL-19 · App's perps withdraw ceiling ignores the paper-USDso credit floor: it offers amounts that revert, or 0 when funds can be withdrawn
Severity: normal
Area: app

| | |
|---|---|
| **Component** | dreamDEX testnet app, perps withdraw ceiling (`perpWithdrawableCeiling` in the public bundle chunk `0uph-3x4hnslu.js`) |
| **Affects** | Accounts holding paper USDso (Perps Arena credit) that withdraw from the Perps account |
| **Reproduce** | `npx tsx repro/19-app-withdraw-ceiling-paper-usdso.ts` (read-only) |
| **Evidence** | [`evidence/19-app-withdraw-ceiling-paper-usdso.log`](../evidence/19-app-withdraw-ceiling-paper-usdso.log), [`evidence/code/19-app-perpWithdrawableCeiling.txt`](../evidence/code/19-app-perpWithdrawableCeiling.txt) |

## Summary

The app computes the perps withdraw ceiling as:

```js
perpWithdrawableCeiling(e) {
  let t = e.withdrawable > 0n ? e.withdrawable : 0n;   // MarginBank.getWithdrawableCollateral
  if (e.imReq <= 0n) return t;
  let r = e.equity - e.imReq;
  if (r <= 0n) return 0n;
  let n = 99n * r / 100n;
  return n < t ? n : t;
}
```

That works around MAJOR-18 for ordinary accounts. For accounts holding **paper USDso**, `withdraw()` also enforces a credit floor (`WithdrawalBelowCreditFloor`) that the formula doesn't model, and the underlying view is wrong in both directions for these accounts. The result:

- **Overstated:** the ceiling offers an amount that reverts `WithdrawalBelowCreditFloor()`.
- **Understated:** the ceiling is `0` while the contract accepts a real withdrawal, so the user can't reach funds they're entitled to.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 19-app-withdraw-ceiling-paper-usdso.ts [accounts]`. For three public paper-USDso accounts, the script evaluates the app's formula on chain data at a pinned block, `eth_call`s `MarginBank.withdraw(ceiling)`, and binary-searches the largest accepted amount.
3. In the app: sign in with a paper-USDso wallet that has an open position, open **Perps ⇆ Spot**, and compare the offered maximum with what a withdrawal accepts.

## Expected

The ceiling equals the largest amount `withdraw()` accepts, including the credit-floor rule.

## Actual

| Account | Credit floor | Equity | App ceiling | `withdraw(ceiling)` | Largest accepted |
|---|---|---|---|---|---|
| `0x021B…dbb1` | 2,000 | 1,989.64 | 19.580688 | `WithdrawalBelowCreditFloor()` | 19.423233 |
| `0xDc2a…6EA0` | 2,000 | 1,945.92 | 131.412414 | `WithdrawalBelowCreditFloor()` | 129.483001 |
| `0x6328…3179` | 2,000 | 2,103.17 | **0** | (nothing offered) | **20.875265** |

## Evidence

- Log: [`evidence/19-app-withdraw-ceiling-paper-usdso.log`](../evidence/19-app-withdraw-ceiling-paper-usdso.log)
- App code (verbatim minified excerpt, chunk URL and SHA-256): [`evidence/code/19-app-perpWithdrawableCeiling.txt`](../evidence/code/19-app-perpWithdrawableCeiling.txt)

## Impact

Perps Arena participants, who are exactly the paper-USDso holders, get a "max" that fails, or are told they have nothing to withdraw when they do. Amounts are small, but it affects the competition's whole user base.

## Suggested fix

Fix the view (MAJOR-18) to apply the credit-floor rule, or add the credit-floor term to `perpWithdrawableCeiling`: `min(…, equity − creditFloor − buffer)` when `creditFloor > 0`.

## Environment

App: `https://app.testnet.dreamdex.io` bundle as served 2026-10-20 (chunk hash in the evidence file) · MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` · Somnia Tokyo testnet (Hideki, chain 50383) · read-only `eth_call`.
