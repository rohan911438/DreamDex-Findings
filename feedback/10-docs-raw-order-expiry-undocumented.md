# Docs: raw placeOrderFor section doesn't say what to pass as expireTimestampNs; 0 reverts OrderAlreadyExpired
Severity: normal
Area: docs

`/docs/developers/perps-testnet` → "Raw and operator calls" shows the full `placeOrderFor(… uint64 expireTimestampNs …)` signature and lists "three things that trip people up" (decimals, gas, IOC no-fill). It doesn't say what `expireTimestampNs` should be for a good-till-cancel order. The natural guess, `0` = no expiry, reverts `OrderAlreadyExpired()`. The SDK silently sends `now + 50 years` (`Writer.farFutureNs()`), so code ported from SDK calls to raw calls breaks here.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 08-raw-order-expiry-zero.ts` (`eth_call` of `placeOrder`, same parameter semantics as `placeOrderFor`)

## Expected
The docs say expiry is absolute nanoseconds, `0` means already expired, and GTC is a far-future value (`type(uint64).max` works).

## Actual
```
expireTimestampNs = 0                                -> OrderAlreadyExpired()
expireTimestampNs = 2^64-1 (max uint64)              -> OK
expireTimestampNs = now + 50y (what the SDK sends)   -> OK
```
Also, a raw call with `expireTimestampNs` in **seconds** or **milliseconds** (common mistakes) is "in the past" in nanoseconds and fails the same way.

## Evidence
`evidence/08-raw-order-expiry-zero.txt`

## Environment
Docs page as of 2026-10-20. SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only `eth_call` from public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`.
