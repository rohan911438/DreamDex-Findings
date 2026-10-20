# NORMAL-13 · `fetchBalance` omits the Perps account: about 2,000 USDso of margin shows as 0.56 USDso
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1, unified `fetchBalance` |
| **Type** | Missing feature / documentation gap |
| **Reproduce** | `npx tsx repro/13-fetch-balance-omits-perps-margin.ts` |
| **Evidence** | [`evidence/13-fetch-balance-omits-perps-margin.log`](../evidence/13-fetch-balance-omits-perps-margin.log) |

## Summary

The unified `fetchBalance()` returns wallet ERC-20 and native balances plus outcome holdings. USDso held in the **Perps account** (the MarginBank), which is the only balance perp orders can use, is not included. The method's documentation doesn't mention this or point to where the perps balance lives (`client.getMarginAccount`). In ccxt, `fetchBalance` on a derivatives venue returns margin balances, so a bot written against the unified layer concludes that a funded perps account has no collateral.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 13-fetch-balance-omits-perps-margin.ts`. For a public account with open perp positions, this prints `fetchBalance().USDso` next to `client.getMarginAccount(marginBank, account)`.

## Expected

`fetchBalance()` reports the perps account (for example as `USDso` with a `perps` / `margin` breakdown, or via a `{ type: "swap" }` option as in ccxt). At minimum, its docs say perps margin isn't included and name the method that returns it.

## Actual

```
fetchBalance().USDso            = {"free":0.557358,"used":0,"total":0.557358}
getMarginAccount (Perps account) = unlocked 1996.437865313236289146 USDso, locked 0, equity 2104.26 USDso
```

## Evidence

- Log: [`evidence/13-fetch-balance-omits-perps-margin.log`](../evidence/13-fetch-balance-omits-perps-margin.log)
- SDK typings: `dist/unified/exchange.d.ts`, doc comment on `fetchBalance` (describes ERC-20, native and outcome holdings only)

## Impact

Unified-layer bots and dashboards show perps users as unfunded. Preflight checks written against `fetchBalance` refuse to trade, or tell users to deposit funds they've already deposited.

## Suggested fix

Add the MarginBank balance to `fetchBalance` (distinguishing free and locked collateral), or add a `fetchBalance({ type: "swap" })` mode. Document the behaviour either way.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
