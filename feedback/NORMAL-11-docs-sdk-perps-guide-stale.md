# NORMAL-11 · The SDK's bundled `PERPS.md` lists two perp markets with symbols that don't exist; 21 are live
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1 → `docs/PERPS.md` (shipped in the npm package) |
| **Affects** | Developers reading the SDK's own perps guide, the version the dreamDEX docs tell them to install |
| **Reproduce** | `npx tsx repro/11-sdk-perps-guide-symbols.ts` |
| **Evidence** | [`evidence/11-sdk-perps-guide-symbols.log`](../evidence/11-sdk-perps-guide-symbols.log) |

## Summary

The perps guide in the published package opens with:

> Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO`, backed by PerpPool CLOBs …

- **21** perp markets are live on the Hideki testnet, not 2.
- The unified symbols are `BTC/USDso:USDso` (mixed case). `loadMarkets()` has **no** `BTC/USDSO:USDSO` key, so a developer copying the guide's symbol gets `undefined`, or an "unknown symbol" error from `createOrder`.
- The guide doesn't say perps run on Hideki (chain 50383) or that `SOMNIA_HIDEKI_TESTNET_ADDRESSES` is the set to use.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 11-sdk-perps-guide-symbols.ts`. This prints lines 1-4 of the installed `docs/PERPS.md`, extracts the symbols it names, and looks them up in `loadMarkets()`.

## Expected

The guide names the network and address set, uses symbols exactly as `loadMarkets()` returns them, and lists or links the live markets.

## Actual

```
@somnia-chain/markets-sdk 0.32.1, docs/PERPS.md lines 1-4:
   1 | # Perpetuals
   3 | Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO`, backed by
loadMarkets(): 21 perp markets
markets["BTC/USDSO:USDSO"] -> undefined (no such key)
markets["ETH/USDSO:USDSO"] -> undefined (no such key)
```

## Evidence

- Log: [`evidence/11-sdk-perps-guide-symbols.log`](../evidence/11-sdk-perps-guide-symbols.log) (includes the full list of 21 live symbols)

## Suggested fix

Update the opening paragraph: "Perps are live on the Hideki testnet (chain 50383, `hidekiTestnet` + `SOMNIA_HIDEKI_TESTNET_ADDRESSES`), 21 markets, symbols of the form `BTC/USDso:USDso`." Point to `listPerpMarkets()` rather than naming markets.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only, no wallet.
