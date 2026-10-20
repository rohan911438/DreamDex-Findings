# MAJOR-05 · `perp-maker` forgets quotes whose cancel failed and exits outside its cleanup path, leaving unmanaged quotes on the book
Severity: major
Area: SDK

| | |
|---|---|
| **Component** | dreamdex-bot-kit `strategies/perp-maker`, `packages/perp-core/src/orders.ts` (`cancelQuietly`), `railway.toml` @ `2579866` |
| **Affects** | Any live `perp-maker` deployment during an RPC error; worse on the kit's Railway template (auto-restart) |
| **Reproduce** | `npx tsx repro/05-perp-maker-rpc-outage.ts` (read-only), plus the live steps below |
| **Evidence** | [`evidence/05-perp-maker-rpc-outage.log`](../evidence/05-perp-maker-rpc-outage.log), [`evidence/code/05-kit-strategies_perp-maker_src_index_ts.txt`](../evidence/code/05-kit-strategies_perp-maker_src_index_ts.txt), [`evidence/code/05-kit-packages_perp-core_src_orders_ts.txt`](../evidence/code/05-kit-packages_perp-core_src_orders_ts.txt), [`evidence/code/05-kit-railway_toml.txt`](../evidence/code/05-kit-railway_toml.txt) |

## Summary

`perp-maker` keeps the IDs of its two resting quotes only in memory. On each re-quote cycle it:

1. cancels the previous quotes with `cancelQuietly` (lines 129-132). `cancelQuietly` **catches every error** and logs `cancel <id> skipped`, assuming the order already filled or expired (`orders.ts` lines 203-218);
2. **discards the IDs**: `resting = { atMark: 0 }` (line 133);
3. calls `inventoryUsdso()` → `fetchPositions()` (line 136), **outside** the `try/catch` that pulls quotes on failure (lines 164-185).

During an RPC disruption the cancels fail but are treated as done, and the IDs are lost. Then either:

- `fetchPositions()` throws `RpcError`, `main()` rejects, and `process.exit(1)` runs (line 203) without touching the book; or
- the RPC recovers in time and the bot places a fresh bid and ask on top of the orders it failed to cancel.

The kit's Railway template restarts a failed service up to 10 times (`restartPolicyType = "ON_FAILURE"`, `restartPolicyMaxRetries = 10`). Each restart begins with empty state and quotes again. Orders carry the SDK's default expiry of now + 50 years, so orphaned quotes stay on the book at stale prices until filled.

## Steps to reproduce

**A. The failing call (read-only)**

1. `cd repro && npm install`
2. `npx tsx 05-perp-maker-rpc-outage.ts`
3. With the RPC unreachable (simulated with a dead endpoint), `fetchPositions()`, which `perp-maker` calls outside its cleanup `try`, throws immediately.

**B. End to end (testnet funds)**

1. Run `perp-maker` with `DRY_RUN=false` on a funded testnet account, `PERP_SYMBOL=ETH-PERP`, defaults otherwise.
2. Wait for `placed quote long …` and `placed quote short …`.
3. Block `api.hideki2.infra.testnet.somnia.network` (hosts file or firewall) for about 30 s while the mark moves more than `PERP_MM_REQUOTE_TRIGGER_BPS` (8 bps by default), then unblock.
4. List the account's resting orders on the pool: `client.getOpenOrdersOnchain([pool], owner)`.

## Expected

- A quote whose cancel can't be confirmed stays tracked and is retried; IDs are dropped only on success or on an error that proves the order is gone.
- Any unexpected exit pulls the bot's quotes, or the bot cancels its own resting orders on startup.

## Actual

```
loadMarkets(true): resolved (55 entries)
fetchPositions(): THREW RpcError: @somnia-chain/markets-sdk: rpc getBlock failed: genesis check failed
```

In the live run the old bid and ask remain resting after the bot exits or re-quotes, and no running process tracks them. Each automatic restart adds another pair.

## Evidence

- Log: [`evidence/05-perp-maker-rpc-outage.log`](../evidence/05-perp-maker-rpc-outage.log)
- Source:
  - [`perp-maker/src/index.ts` L125-205](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L125-L205) (cancel, discard, unguarded read, exit)
  - [`perp-core/src/orders.ts` L199-219](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/orders.ts#L199-L219) (`cancelQuietly` swallows every error)
  - [`railway.toml`](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/railway.toml) (restart on failure, 10 retries)
  - All excerpted in `evidence/code/05-*`

## Impact

The kit's market-making template can leave **unbounded, unmanaged maker exposure** after an ordinary transient RPC error. Stale quotes get picked off as the market moves, and the account accumulates positions the bot doesn't know about.

## Root cause

Order state lives only in memory, cancel failures are treated as success, and the cleanup `try` covers placement but not the reads before it.

## Suggested fix

1. In `cancelQuietly`, distinguish "order not found / already filled" (safe to drop) from transport or RPC errors (keep the ID, retry next cycle).
2. Move the whole cycle body inside the `try`, with quote cancellation in a `finally` on fatal errors.
3. On startup, cancel the account's resting orders on the market (`getOpenOrdersOnchain`) before quoting, so a restart can't stack quotes.

## Environment

- Bot kit: `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4`
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet (Hideki, chain 50383)
- Wallet: none for step A; a funded testnet key for step B
