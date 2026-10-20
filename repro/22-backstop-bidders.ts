// NORMAL-22: the docs say "No backstop bidders are registered on testnet".
// Read the LiquidationEngine configuration through the documented path.
import { exchange, done, J } from "./lib.js";

const ex = exchange();
const c = ex.client as any;
const rows: any[] = await c.listPerpMarkets();
const cfg = await c.getPerpSystemConfig(rows[0].marginBank);
console.log(`getPerpSystemConfig(${rows[0].marginBank}).liquidationEngine = ${cfg.liquidationEngine}`);
console.log(`getLiquidationEngineConfig -> ${J(await c.getLiquidationEngineConfig(cfg.liquidationEngine))}`);
await done(ex);
