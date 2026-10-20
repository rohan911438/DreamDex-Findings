# fetchOpenOrders on perps fails with "PerpPortfolio failed: database query error" for high-activity accounts
Severity: major
Area: API

For accounts with a lot of perp activity (market makers and multi-market bots), every call to the unified `exchange.fetchOpenOrders(...)` takes about 10 seconds and then throws `IndexerError: indexer PerpPortfolio failed: database query error`. The indexer's `PerpPortfolio` query appears to hit a server-side statement timeout. Ordinary accounts get an answer in about 150-300 ms from the same endpoint.

## Steps to reproduce
1. `cd repro && npm install`
2. `npx tsx 02-fetch-open-orders-fails-for-makers.ts`
   (three accounts: two active market makers and one control; each is queried 3 times)

## Expected
A list of the account's open orders. The pool shows 20 resting BTC orders for `0x4753…`.

## Actual
```
0x47537E3A… attempt 1: fetchOpenOrders THREW IndexerError: … indexer PerpPortfolio failed: database query error (after 10323 ms) | pool shows 20 resting BTC orders
0x47537E3A… attempt 2: … database query error (after 10621 ms)
0x47537E3A… attempt 3: … database query error (after 10473 ms)
0x420691db… attempt 1: … database query error (after 11056 ms)
0x420691db… attempt 2: … database query error (after 10449 ms)
0x420691db… attempt 3: fetchOpenOrders -> 0 orders in 1135 ms
0x63284B68… attempts 1-3: fetchOpenOrders -> 0 orders in 151-294 ms   (control)
```
It fails with and without a symbol and with `limit` 500. `0x4206…` has no resting BTC orders, but trades all 21 markets and fails 2/3. The trigger looks like account history volume, not the number of open orders.

## Impact
Market-making bots are the accounts most likely to call this, and they can't list their own orders. The SDK docs warn that treating this error as "no orders" makes a bot quote on top of its live orders. The only workaround is `client.getOpenOrdersOnchain`, which returns raw rows without symbol or side.

## Suggested fix
Index or limit the `PerpPortfolio` query so its cost doesn't grow with the account's full history (filter open orders server-side, or paginate fills separately).

## Evidence
- `evidence/02-open-orders.txt`
- Indexer: `https://hideki-dev.smk.somnia.host/v1/graphql`, operation `PerpPortfolio`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383). Read-only, no wallet needed. Accounts: `0x47537E3A3ea6e9391F3B26Ea45618db6828c8bfF`, `0x420691db9D2B5a79210FDA48c177471386b6Dfd1` (control `0x63284B6863D2973781DF2aE47B6F37fc8D453179`). Observed 2026-10-20.
