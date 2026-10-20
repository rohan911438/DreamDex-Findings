# NORMAL-26 · Docs say every pool runs a 100000 (100 bps) builder-fee cap; every perp pool runs 10000 (10 bps)
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | `/docs/developers/contracts/errors` (Builder codes → `BuilderCodesNotSupported`), and the SDK note on `getMaxBuilderFeeBpsTimes1k` |
| **Affects** | Builder/frontend integrators choosing a builder fee |
| **Reproduce** | `npx tsx repro/26-builder-fee-cap-vs-docs.ts` (read-only) |
| **Evidence** | [`evidence/26-builder-fee-cap-vs-docs.log`](../evidence/26-builder-fee-cap-vs-docs.log) |

## Summary

The Errors page, explaining `BuilderCodesNotSupported`, says:

> Every mainnet and testnet pool currently runs a `100000` (100 BPS) cap, so this should not fire — read `getMaxBuilderFeeBpsTimes1k()` rather than assuming.

Every perp pool's `getMaxBuilderFeeBpsTimes1k()` actually returns **`10000`** (10 bps = 0.10%), 10× smaller than the documented figure. The advice to read the value rather than assume it is good, and enforcement is correct — but the concrete number in the docs is wrong for perp pools, and a builder that hard-codes the documented 100000 (or sizes a fee against it) will have every such order rejected with `BuilderFeeExceedsCap`.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 26-builder-fee-cap-vs-docs.ts`
3. It reads `getMaxBuilderFeeBpsTimes1k()` on all 21 perp pools, then `eth_call`s `placeOrder` with a range of builder fees from an account that hasn't approved the builder.

## Expected

The documented cap matches the chain (either 100000 everywhere as stated, or the docs note that perp pools run 10000).

## Actual

```
perp pool builder-fee cap (bpsTimes1k) across 21 markets -> {"10000":21}
docs: "Every mainnet and testnet pool currently runs a 100000 (100 BPS) cap"

BTC placeOrder builderFeeBpsTimes1k=  1000 (unapproved builder) -> BuilderFeeExceedsApproval()
BTC placeOrder builderFeeBpsTimes1k= 10000 (unapproved builder) -> BuilderFeeExceedsApproval()
BTC placeOrder builderFeeBpsTimes1k= 10001 (unapproved builder) -> BuilderFeeExceedsCap()
BTC placeOrder builderFeeBpsTimes1k=100000 (unapproved builder) -> BuilderFeeExceedsCap()
```

The revert flips from `BuilderFeeExceedsApproval` to `BuilderFeeExceedsCap` exactly between 10000 and 10001, which pins the cap at 10000.

## Evidence

- Log: [`evidence/26-builder-fee-cap-vs-docs.log`](../evidence/26-builder-fee-cap-vs-docs.log)

## Impact

Minor, but concrete: a builder integration that trusts the documented 100 bps cap sets a fee the pool rejects, and the "this should not fire" framing discourages handling `BuilderCodesNotSupported` / `BuilderFeeExceedsCap`. Enforcement and the per-pool approval model are correct (verified by the revert ladder); only the number is stale.

## Suggested fix

State the perp-pool cap as 10000 (10 bps), or note that caps are per-pool and owner-updatable and the 100000 figure is the spot/binary value. Keep the "read `getMaxBuilderFeeBpsTimes1k()`" advice.

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · read-only `eth_call` from public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
