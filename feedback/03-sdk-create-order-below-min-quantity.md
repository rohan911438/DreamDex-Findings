# Unified createOrder sends perp orders below minQuantity; they revert on chain with QuantityBelowMinimum
Severity: major
Area: SDK

The unified `createOrder` aligns the amount to the lot and rejects it only when the result is `0` (below one lot). The code justifies this with a comment that is false for perps:

> One lot is also the venue's `minQuantity`: every deployed venue sets tick = lot = min … there is no band where an order passes here and still reverts as below-minimum.
> (`dist/unified/exchange.js:4373-4380`)

On all 21 perp markets `minQuantity` is between 9 and 69 lots. Any amount in `[lot, minQuantity)` passes the SDK, gets signed and mined, and reverts `QuantityBelowMinimum(quantity, minimum)`. The SDK sends perp orders without pre-simulating, so the user pays gas for the failed transaction. `market.limits.amount.min` already holds the right minimum but isn't checked.

## Steps to reproduce
1. `cd repro && npm install`
2. `npx tsx 03-create-order-below-min-quantity.ts`
3. The script prints lot vs `minQuantity` for every perp market, shows `amountToPrecision("BTC/USDso:USDso", 0.0001)` returns `0.0001` without complaint, then `eth_call`s `placeOrder` from a funded account for 0.0001 and 0.00013 BTC.

## Expected
`createOrder("BTC/USDso:USDso", "limit", "buy", 0.0001, …)` throws `InvalidInputError` before sending, as it already does for amounts below one lot.

## Actual
The SDK guard passes (0.0001 BTC = 10 lots). On chain:
```
eth_call placeOrder BTC bid 0.0001 BTC  -> QuantityBelowMinimum(10000,13000)
eth_call placeOrder BTC bid 0.00013 BTC -> OK
```
Lots per minimum across markets: ZRO 51, XRP 69, XLM 54, ADA 46, TAO 44, ETH 40, … BTC 13, ZEC 9 (full table in evidence).

## Impact
A ccxt-style bot that sizes from a USD notional will regularly produce sizes just under the minimum on small notionals. Each one becomes a mined, failed transaction instead of a clear local error.

## Suggested fix
In `createOrder`, reject `quantity < market.limits.amount.min` (raw `minQuantity`) for perp markets, and correct the comment.

## Evidence
- `evidence/03-below-min.txt`
- Code: `node_modules/@somnia-chain/markets-sdk/dist/unified/exchange.js:4373-4381`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only `eth_call` from public account `0x63284B6863D2973781DF2aE47B6F37fc8D453179`, no wallet needed.
