# perp-maker forgets quotes whose cancel failed, and crashes outside its cleanup path, leaving unmanaged quotes on the book
Severity: major
Area: SDK

`strategies/perp-maker/src/index.ts` keeps its two quote IDs only in memory. Each re-quote cycle:

1. cancels the old quotes with `cancelQuietly` (lines 129-132), which **catches every error** and logs `cancel <id> skipped` (`packages/perp-core/src/orders.ts:203-218`), assuming the order already filled or expired;
2. forgets them: `resting = { atMark: 0 }` (line 133);
3. calls `inventoryUsdso()` → `fetchPositions()` (line 136), **outside** the `try/catch` that pulls quotes on failure (lines 164-185).

If the RPC hiccups during a cycle, the cancels fail but are reported as skipped and the IDs are dropped. Then either:
- `fetchPositions` throws `RpcError`, `main()` rejects, and `process.exit(1)` runs (line 203) without touching the book, or
- the RPC recovers and the bot places a fresh bid and ask on top of the old ones.

The kit's Railway config restarts on failure up to 10 times (`railway.toml`: `restartPolicyType = "ON_FAILURE"`, `restartPolicyMaxRetries = 10`), and each restart starts with empty state. Orders carry the SDK's 50-year expiry, so orphaned quotes rest indefinitely at stale prices.

## Steps to reproduce
1. `cd repro && npm install && npx tsx 13-rpc-outage-throws-in-maker-loop.ts`
   This shows the SDK calls in the loop during an RPC outage: `fetchPositions()` throws `RpcError: rpc getBlock failed: genesis check failed`.
2. Live reproduction: run `perp-maker` with `DRY_RUN=false` on a funded testnet key. Once a bid and ask rest, block `api.hideki2.infra.testnet.somnia.network` (hosts file or firewall) for ~30 s while the mark moves past `PERP_MM_REQUOTE_TRIGGER_BPS`, then unblock.
3. Check the account's resting orders on the pool (`client.getOpenOrdersOnchain([pool], owner)`).

## Expected
A quote the bot can't confirm as cancelled stays tracked and is retried. An unexpected exit pulls the quotes (or the bot cancels all its own orders on startup).

## Actual
The old quotes are still resting and no running process tracks them. After a crash and Railway restart, a new pair is added each time.

## Impact
Unbounded, unmanaged maker exposure at stale prices, from the kit's own market-making template, triggered by an ordinary RPC error.

## Suggested fix
- Only drop an ID when the cancel succeeded or the error proves the order is gone (`OrderNotFound` or similar).
- Wrap the whole cycle in the cleanup `try/finally`.
- On startup, cancel the account's resting orders on the market (`getOpenOrdersOnchain`) before quoting.

## Evidence
- `evidence/13-rpc-outage.txt`
- Code: `dreamdex-bot-kit/strategies/perp-maker/src/index.ts:127-136, 164-185, 198-205`; `packages/perp-core/src/orders.ts:203-218`; `railway.toml`

## Environment
dreamdex-bot-kit `main` @ `2579866`, SDK `@somnia-chain/markets-sdk@0.32.1`. Network: Somnia Tokyo testnet (Hideki, chain 50383).
