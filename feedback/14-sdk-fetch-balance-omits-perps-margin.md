# fetchBalance leaves out the Perps account, so a perps trader with about 2,000 USDso margin shows 0.56 USDso
Severity: normal
Area: SDK

Missing feature / docs gap. The unified `fetchBalance()` returns wallet ERC-20 and native balances and outcome holdings. USDso sitting in the Perps account (MarginBank), which is where perp trading happens, isn't in it, and the method's docs don't say so or point to `client.getMarginAccount`. In ccxt, `fetchBalance` on a derivatives exchange returns margin balances. A bot written against the unified layer concludes it has no collateral.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 10-fetch-balance-omits-perps-margin.ts`

## Expected
`fetchBalance()` includes the perps account (for example under `USDso` with a `perps`/`margin` breakdown, or a `{ type: "swap" }` option as in ccxt), or its docs state that it doesn't and name the method that does.

## Actual
```
fetchBalance().USDso            = {"free":0.557358,"used":0,"total":0.557358}
getMarginAccount (Perps account) = unlocked 1996.437865313236289146 USDso, locked 0, equity 2111.030237986936493665
```

## Evidence
`evidence/10-fetch-balance-omits-perps-margin.txt`; `dist/unified/exchange.d.ts` doc comment on `fetchBalance`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only, public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
