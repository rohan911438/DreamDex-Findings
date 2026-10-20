# NORMAL-08 · No exported ABI contains `placeOrderFor` / `placeOrdersFor` / `cancelOrderFor`, which the docs tell raw callers to use
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | `@somnia-chain/markets-sdk` 0.32.1 exported ABIs (`perpPoolWriteAbi` and others) |
| **Affects** | Anyone following the developer docs' "Raw and operator calls" section |
| **Reproduce** | `npx tsx repro/08-perp-write-abi-missing-operator-calls.ts` |
| **Evidence** | [`evidence/08-perp-write-abi-missing-operator-calls.log`](../evidence/08-perp-write-abi-missing-operator-calls.log) |

## Summary

`/docs/developers/perps-testnet` → "Raw and operator calls" tells bot builders to call `placeOrderFor` and `placeOrdersFor` on the perp pool, and to read `getOrderBookParameters()` for tick, minimum and lot. The SDK exports `perpPoolWriteAbi`, but it contains only `placeOrder`, `cancelOrder`, `updateFunding` and `marginBank`. None of the documented operator functions appears in **any** exported ABI (`amendOrders` is the exception, in `orderBookBatchWriteAbi`). Builders have to hand-write these fragments, which the bot kit itself does in `packages/perp-core/src/operator.ts`.

## Steps to reproduce

1. `cd repro && npm install`
2. `npx tsx 08-perp-write-abi-missing-operator-calls.ts`. This lists `perpPoolWriteAbi`'s functions and searches every `*Abi` export of the package for each documented function.

## Expected

The functions the docs direct developers to are in an exported ABI, either in `perpPoolWriteAbi` or in a dedicated `perpPoolOperatorAbi`.

## Actual

```
perpPoolWriteAbi functions: placeOrder, cancelOrder, updateFunding, marginBank
placeOrderFor            in perpPoolWriteAbi: NO; exported in: (no exported ABI)
placeOrdersFor           in perpPoolWriteAbi: NO; exported in: (no exported ABI)
cancelOrderFor           in perpPoolWriteAbi: NO; exported in: (no exported ABI)
amendOrders              in perpPoolWriteAbi: NO; exported in: orderBookBatchWriteAbi
getOrderBookParameters   in perpPoolWriteAbi: NO; exported in: (no exported ABI)
```

## Impact

Every raw or operator integration re-derives the ABI by hand, a common source of encoding bugs (wrong tuple order, wrong `uint` widths) on the payable `placeOrderFor` path, which takes ten arguments.

## Suggested fix

Export the full PerpPool operator surface (`placeOrderFor`, `placeOrdersFor`, `cancelOrderFor`, `cancelOrdersFor`, `getOrderBookParameters`), and link it from the raw-calls section of the docs.

## Environment

SDK `@somnia-chain/markets-sdk` 0.32.1 · docs as of 2026-10-20 · no network access needed.
