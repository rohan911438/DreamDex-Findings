# Exported perpPoolWriteAbi lacks placeOrderFor / placeOrdersFor / cancelOrderFor that the docs tell raw callers to use
Severity: normal
Area: SDK

The developer docs' "Raw and operator calls" section (`/docs/developers/perps-testnet`) tells bot builders to call `placeOrderFor` and `placeOrdersFor` directly and to read `getOrderBookParameters()`. The SDK's exported `perpPoolWriteAbi` contains only `placeOrder`, `cancelOrder`, `updateFunding` and `marginBank`, and no exported ABI has `placeOrderFor`, `placeOrdersFor`, `cancelOrderFor` or `getOrderBookParameters`. (`amendOrders` is in `orderBookBatchWriteAbi`.) Everyone writing raw operator calls has to hand-write the ABI. The bot kit does exactly that in `packages/perp-core/src/operator.ts`.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 11-perp-write-abi-missing-operator-calls.ts`

## Expected
The documented raw functions are in an exported ABI (`perpPoolWriteAbi` or a `perpPoolOperatorAbi`).

## Actual
```
perpPoolWriteAbi functions: placeOrder, cancelOrder, updateFunding, marginBank
placeOrderFor            in perpPoolWriteAbi: NO; exported in: (no exported ABI)
placeOrdersFor           in perpPoolWriteAbi: NO; exported in: (no exported ABI)
cancelOrderFor           in perpPoolWriteAbi: NO; exported in: (no exported ABI)
amendOrders              in perpPoolWriteAbi: NO; exported in: orderBookBatchWriteAbi
getOrderBookParameters   in perpPoolWriteAbi: NO; exported in: (no exported ABI)
```

## Evidence
`evidence/11-perp-write-abi-missing-operator-calls.txt`

## Environment
SDK `@somnia-chain/markets-sdk@0.32.1`.
