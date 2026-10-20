# Docs: the SDK's bundled PERPS.md says only BTC and ETH perps exist, with symbols that don't resolve
Severity: normal
Area: docs

`node_modules/@somnia-chain/markets-sdk/docs/PERPS.md` (shipped in 0.32.1, the version the dreamDEX docs name) opens with:

> Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO` …

- There are 21 live perp markets on the Hideki testnet.
- The unified symbols are `BTC/USDso:USDso` (mixed case). `loadMarkets()` returns no `BTC/USDSO:USDSO` key, so the guide's symbols don't match any market.
- The guide doesn't mention Hideki / chain 50383 (where perps actually run) or `SOMNIA_HIDEKI_TESTNET_ADDRESSES`.

## Steps to reproduce
1. `npm i @somnia-chain/markets-sdk@0.32.1`, open `node_modules/@somnia-chain/markets-sdk/docs/PERPS.md` lines 1-4.
2. `const m = await exchange.loadMarkets(); console.log(Object.keys(m).filter(k => k.includes("USDSO")))` returns `[]`; `Object.keys(m).filter(k => k.endsWith(":USDso")).length` returns `21`.

## Expected
The guide lists or links the live markets, uses symbols as `loadMarkets()` returns them, and names the Hideki network and address set.

## Actual
It describes an older two-market deployment with upper-case symbols.

## Evidence
`docs/PERPS.md:3-4` in the published package; `evidence/06-unified-amount-precision.txt` (live symbol list).

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383).
