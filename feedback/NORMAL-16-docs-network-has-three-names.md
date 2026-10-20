# NORMAL-16 · The perps network has three names (Somnia Tokyo / Hideki / DreamDEX region) and no page says they're the same
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | Bounty page, `/docs/developers/perps-testnet`, SDK chain exports, bot kit |
| **Affects** | New builders choosing a chain definition and address set |
| **Reproduce** | `npx tsx repro/16-network-names.ts` (prints the SDK's names and the RPC chain id) |
| **Evidence** | [`evidence/16-network-names.log`](../evidence/16-network-names.log), [`evidence/code/16-kit-packages_perp-core_src_config_ts.txt`](../evidence/code/16-kit-packages_perp-core_src_config_ts.txt) |

## Summary

One network appears under different names depending on where a builder looks:

| Where | Name used |
|---|---|
| Bounty page, submission template ("Environment") | **Somnia Tokyo testnet** |
| `/docs/developers/perps-testnet` | the **Hideki** testnet chain, "which the app shows as the **DreamDEX** region" |
| SDK (`@somnia-chain/markets-sdk/chains`) | `hidekiTestnet`, name `"Hideki Testnet"`; address set `SOMNIA_HIDEKI_TESTNET_ADDRESSES` |
| Explorer link in the developer docs | `explorer.testnet.somnia.network/tokyo` |
| Bot kit | `NETWORK=hideki`; one code comment says "`hideki` (the Tokyo testnet, …)" |

The developer docs never say "Tokyo" in text (only in the explorer URL), and the bounty page never says "Hideki". Meanwhile a *different* Somnia testnet (Shannon, chain 50312) is exported by the SDK as `somniaShannon`, named `"Somnia Testnet"`, with the generic-sounding `SOMNIA_TESTNET_ADDRESSES`. A builder told to use "Somnia Tokyo testnet" can reasonably pick the generic testnet constants. That's the mistake the bot kit itself makes (MAJOR-03).

## Steps to reproduce

1. Read the bounty page, then `/docs/developers/perps-testnet`; search each for "Tokyo" and "Hideki".
2. `cd repro && npm install && npx tsx 16-network-names.ts`

## Expected

One sentence on the developer page and in the SDK's chain docs: *"Somnia Tokyo testnet = Hideki = chain 50383 = the app's DreamDEX region. Use `hidekiTestnet` with `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, not `SOMNIA_TESTNET_ADDRESSES` (Shannon, chain 50312)."*

## Actual

```
chains.hidekiTestnet    id 50383  name "Hideki Testnet"  rpc https://api.hideki2.infra.testnet.somnia.network
chains.somniaShannon    id 50312  name "Somnia Testnet"  rpc https://api.infra.testnet.somnia.network
eth_chainId of https://api.hideki2.infra.testnet.somnia.network = 50383
```

No page links the names together.

## Evidence

- Log: [`evidence/16-network-names.log`](../evidence/16-network-names.log)
- Bot kit comment: [`evidence/code/16-kit-packages_perp-core_src_config_ts.txt`](../evidence/code/16-kit-packages_perp-core_src_config_ts.txt)

## Suggested fix

Add the mapping sentence above to the developer page's "Network" table (a "Also known as" row), and to the SDK's `docs/CHAINS.md`.

## Environment

Bounty page and docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · bot kit @ `2579866` · Somnia Tokyo testnet (Hideki, chain 50383).
