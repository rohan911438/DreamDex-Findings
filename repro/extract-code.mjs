// Saves the exact source lines each finding cites, with line numbers and a
// permanent link, to ../evidence/code/. Bot kit files are fetched at a fixed
// commit; SDK files are read from the installed @somnia-chain/markets-sdk.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const KIT = "25798660bbe4674a6f83a960b202852896e2fed4";
const require = createRequire(import.meta.url);
const sdkDir = join(process.cwd(), "node_modules", "@somnia-chain", "markets-sdk");
const sdkVersion = JSON.parse(readFileSync(join(sdkDir, "package.json"), "utf8")).version;

const excerpts = [
  ["01", "sdk", "dist/perp/margin.js", [[1440, 1460]]],
  ["02", "sdk", "dist/unified/exchange.js", [[4362, 4384]]],
  ["03", "kit", "packages/perp-core/src/exchange.ts", [[33, 58]]],
  ["03", "kit", "packages/perp-core/src/markets.ts", [[76, 95]]],
  ["04", "kit", "strategies/perp-starter/src/index.ts", [[119, 125], [170, 188], [218, 228]]],
  ["05", "kit", "strategies/perp-maker/src/index.ts", [[125, 137], [162, 186], [196, 205]]],
  ["05", "kit", "packages/perp-core/src/orders.ts", [[199, 219]]],
  ["05", "kit", "railway.toml", [[1, 12]]],
  ["06", "kit", "packages/perp-core/src/orders.ts", [[234, 298]]],
  ["07", "sdk", "dist/unified/structs.js", [[189, 200]]],
  ["09", "sdk", "dist/writer.js", [[33, 35]]],
  ["12", "sdk", "dist/unified/portfolioAnalytics.js", [[160, 171]]],
  ["16", "kit", "packages/perp-core/src/config.ts", [[12, 20]]],
  ["17", "kit", "strategies/perp-starter/src/index.ts", [[97, 101]]],
  ["17", "kit", "packages/perp-core/src/stops.ts", [[12, 17], [78, 83], [125, 133]]],
];

mkdirSync("../evidence/code", { recursive: true });
for (const [id, where, path, ranges] of excerpts) {
  const text = where === "sdk"
    ? readFileSync(join(sdkDir, path), "utf8")
    : await (await fetch(`https://raw.githubusercontent.com/somnia-chain/dreamdex-bot-kit/${KIT}/${path}`)).text();
  const lines = text.split(/\r?\n/);
  const source = where === "sdk"
    ? `@somnia-chain/markets-sdk@${sdkVersion} (npm) : ${path}`
    : `somnia-chain/dreamdex-bot-kit @ ${KIT} : ${path}`;
  const parts = [`# Finding ${id}`, `# Source: ${source}`];
  for (const [a, b] of ranges) {
    if (where === "kit") parts.push(`# https://github.com/somnia-chain/dreamdex-bot-kit/blob/${KIT}/${path}#L${a}-L${b}`);
  }
  for (const [a, b] of ranges) {
    parts.push("", `--- lines ${a}-${b} ---`);
    for (let n = a; n <= b && n <= lines.length; n++) parts.push(`${String(n).padStart(5)} | ${lines[n - 1]}`);
  }
  const name = `${id}-${where}-${path.replace(/[\/.]/g, "_")}.txt`;
  writeFileSync(`../evidence/code/${name}`, parts.join("\n") + "\n");
  console.log(`evidence/code/${name}`);
}
