# Docs: the perps network has three names (Somnia Tokyo / Hideki / DreamDEX region) and no page says they're the same
Severity: normal
Area: docs

The same network appears under different names depending on where a builder looks:

| Where | Name used |
| --- | --- |
| Bounty page, submission template ("Environment") | **Somnia Tokyo testnet** |
| `/docs/developers/perps-testnet` | **Hideki** testnet chain, "which the app shows as the **DreamDEX** region" |
| SDK (`@somnia-chain/markets-sdk/chains`) | `hidekiTestnet`, name `"Hideki Testnet"`, `SOMNIA_HIDEKI_TESTNET_ADDRESSES` |
| Explorer link in the docs | `explorer.testnet.somnia.network/tokyo` |
| Bot kit | `NETWORK=hideki`, "the Hideki testnet (chain 50383)"; one code comment says "the Tokyo testnet" |

The developer docs never say "Tokyo" in their text (only in the explorer URL), and the bounty never says "Hideki". There's also a separate Somnia testnet (Shannon, chain 50312) that the SDK calls plain `testnet` (`SOMNIA_TESTNET_ADDRESSES`). A builder told to use "Somnia Tokyo testnet" can easily pick `SOMNIA_TESTNET_ADDRESSES`, which is the mistake the bot kit itself makes (see `04-…`).

## Steps to reproduce
1. Read the bounty page, then `/docs/developers/perps-testnet`, then `@somnia-chain/markets-sdk/chains` exports, and search each for "Tokyo" and "Hideki".

## Expected
One sentence on the developer page (and in the SDK chains docs): "Somnia Tokyo testnet = Hideki = chain 50383 = the app's DreamDEX region; use `hidekiTestnet` + `SOMNIA_HIDEKI_TESTNET_ADDRESSES`, not `SOMNIA_TESTNET_ADDRESSES` (Shannon, 50312)."

## Actual
No page links the names together.

## Environment
Docs and bounty page as of 2026-10-20; SDK `@somnia-chain/markets-sdk@0.32.1`; bot kit `2579866`.
