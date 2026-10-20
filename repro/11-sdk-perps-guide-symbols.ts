// NORMAL-11: the SDK's bundled docs/PERPS.md names two perp markets with
// upper-case symbols. Compare with what loadMarkets() actually returns.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { exchange, done } from "./lib.js";

const require = createRequire(import.meta.url);
const pkgDir = join(process.cwd(), "node_modules", "@somnia-chain", "markets-sdk");
const version = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;
const guide = readFileSync(join(pkgDir, "docs", "PERPS.md"), "utf8").split(/\r?\n/);
console.log(`@somnia-chain/markets-sdk ${version}, docs/PERPS.md lines 1-4:`);
guide.slice(0, 4).forEach((l, i) => console.log(`  ${String(i + 1).padStart(2)} | ${l}`));
const named = [...new Set(guide.join("\n").match(/[A-Z0-9]+\/USDSO:USDSO/g) ?? [])];
console.log(`symbols named in the guide: ${named.join(", ")}`);

const ex = exchange();
const markets = await ex.loadMarkets();
const perps = Object.values(markets).filter((m: any) => m.type === "swap").map((m: any) => m.symbol);
console.log(`\nloadMarkets(): ${perps.length} perp markets`);
console.log(`  ${perps.join(", ")}`);
for (const s of named) console.log(`markets["${s}"] -> ${(markets as any)[s] ? "found" : "undefined (no such key)"}`);
await done(ex);
