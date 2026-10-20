// Unified market metadata reports precision.amount = 0 ("whole units") for
// perp markets whose lot is 10 or 100 units, so precision no longer describes
// the amount grid. Compares precision with lotSize for every perp market.
import { exchange, done } from "./lib.js";
import { formatUnits } from "viem";

const ex = exchange();
const markets = await ex.loadMarkets();
console.log("symbol                 precision.amount  lotSize  amount grid implied by precision  matches?");
for (const m of Object.values(markets) as any[]) {
  if (m.type !== "swap") continue;
  const lot = Number(formatUnits(BigInt(m.info.lotSize), m.info.baseDecimals));
  const implied = 10 ** -m.precision.amount;
  const ok = Math.abs(implied - lot) < 1e-12 * Math.max(1, lot);
  console.log(`${m.symbol.padEnd(22)} ${String(m.precision.amount).padEnd(17)} ${String(lot).padEnd(8)} ${String(implied).padEnd(34)} ${ok ? "yes" : "NO"}`);
}
const ids = ["1000PEPE/USDso:USDso", "PUMP/USDso:USDso", "DOGE/USDso:USDso"];
for (const s of ids) {
  console.log(`amountToPrecision("${s}", 2750) = ${(ex as any).amountToPrecision(s, 2750)}  (precision.amount says 2750 is already valid)`);
}
await done(ex);
