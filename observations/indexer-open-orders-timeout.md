# Observation (not filed): `fetchOpenOrders` intermittently failed with `PerpPortfolio … database query error` for high-activity accounts

**Status: withdrawn. Not reproducible at the time of submission.** Kept here for transparency and in case the maintainers have server logs for the window below.

## What was observed

On 2026-10-20 (UTC), `exchange.fetchOpenOrders("BTC/USDso:USDso")` with `@somnia-chain/markets-sdk` 0.32.1 against `https://hideki-dev.smk.somnia.host/v1/graphql` repeatedly took about 10 s and then threw:

```
IndexerError: @somnia-chain/markets-sdk: indexer PerpPortfolio failed: database query error
```

It affected two high-activity accounts. A control account with ordinary activity always answered in about 150-500 ms.

| Run (in order, same day) | `0x47537E3A…8bfF` (market maker) | `0x420691db…Dfd1` (multi-market bot) | Control `0x63284B68…3179` |
|---|---|---|---|
| 1 | 3 / 3 failed | 3 / 3 failed | 0 / 3 failed |
| 2 | 3 / 3 failed | 2 / 3 failed | 0 / 3 failed |
| 3 | 1 / 3 failed | 0 / 3 failed | 0 / 3 failed |
| 4 (final; timestamp in log header) | **0 / 8 failed** | **0 / 8 failed** | 0 / 8 failed |

The failure rate dropped to zero across the day, consistent with a load- or capacity-dependent query timeout that was resolved or eased. The bounty pays only for issues the team can reproduce, so this isn't filed as a finding.

## What was ruled out

When the indexer did answer, its open orders matched the pool exactly. Order IDs from `fetchOpenOrders` were compared with `getAllOpenOrdersOffChain` read at the same moment, four rounds 20 s apart: 11/11, 19/19, 20/20, 20/20, with no extra and no missing IDs. An apparent 20-vs-12 mismatch in an earlier run was the market maker re-quoting between two reads, not stale indexer data.

## Files

- Script: [`fetch-open-orders-timeout.ts`](fetch-open-orders-timeout.ts) (run from `repro/` with `npx tsx ../observations/fetch-open-orders-timeout.ts`)
- Final run (no failures): [`fetch-open-orders-timeout-final-run.log`](fetch-open-orders-timeout-final-run.log)
