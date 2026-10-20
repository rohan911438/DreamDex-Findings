# NORMAL-09 · Raw-call docs don't say what to pass as `expireTimestampNs`; `0` reverts `OrderAlreadyExpired`
Severity: normal
Area: docs

| | |
|---|---|
| **Component** | `/docs/developers/perps-testnet` → "Raw and operator calls" |
| **Affects** | Anyone calling `placeOrder` / `placeOrderFor` directly, not through the SDK |
| **Reproduce** | `npx tsx repro/09-raw-order-expiry-zero.ts` (read-only `eth_call`) |
| **Evidence** | [`evidence/09-raw-order-expiry-zero.log`](../evidence/09-raw-order-expiry-zero.log), [`evidence/code/09-sdk-dist_writer_js.txt`](../evidence/code/09-sdk-dist_writer_js.txt) |

## Summary

The section prints the full `placeOrderFor(… uint64 expireTimestampNs …)` signature and lists the "three things [that] trip people up" (base-asset decimals, gas, IOC no-fill). It never says what `expireTimestampNs` should be for a good-till-cancelled order, or that it's absolute **nanoseconds**. The usual "0 = no expiry" convention reverts. The SDK quietly sends `now + 50 years` (`Writer.farFutureNs()`), so code ported from SDK calls to raw calls breaks here with no hint why.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 09-raw-order-expiry-zero.ts`. This `eth_call`s `PerpPool.placeOrder` (same parameter semantics as `placeOrderFor`) from a funded public account, as a minimum-size BTC bid 10% under the mark, with three expiry values.

## Expected

The docs state that the expiry is an absolute Unix time in nanoseconds, that `0` (or any past value) reverts `OrderAlreadyExpired`, and what to pass for GTC (`type(uint64).max`, or now + N years as the SDK does).

## Actual

```
expireTimestampNs = 0                                -> OrderAlreadyExpired()
expireTimestampNs = 2^64-1 (max uint64)              -> OK
expireTimestampNs = now + 50y (what the SDK sends)   -> OK
```

Passing seconds or milliseconds (other common mistakes) is also "in the past" when read as nanoseconds and fails the same way.

## Evidence

- Log: [`evidence/09-raw-order-expiry-zero.log`](../evidence/09-raw-order-expiry-zero.log)
- SDK default: [`evidence/code/09-sdk-dist_writer_js.txt`](../evidence/code/09-sdk-dist_writer_js.txt) (`farFutureNs()`, `dist/writer.js` lines 33-35)

## Suggested fix

Add a fourth bullet to "Raw and operator calls": *"`expireTimestampNs` is absolute Unix time in **nanoseconds**. `0` or any past value reverts `OrderAlreadyExpired()`. For good-till-cancelled pass `type(uint64).max` (the SDK sends now + 50 years)."*

## Environment

Docs as of 2026-10-20 · SDK `@somnia-chain/markets-sdk` 0.32.1 · Somnia Tokyo testnet (Hideki, chain 50383) · `eth_call` from public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`, no wallet.
