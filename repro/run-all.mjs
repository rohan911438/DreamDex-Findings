// Runs every reproduction script and writes ../evidence/<id>.log with a header
// recording when, where and with what versions it ran.
//
//   node run-all.mjs            # all
//   node run-all.mjs 01 05      # selected
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const RPC = "https://api.hideki2.infra.testnet.somnia.network";
const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql";
const require = createRequire(import.meta.url);
const sdk = JSON.parse(readFileSync("node_modules/@somnia-chain/markets-sdk/package.json", "utf8")).version;
const viem = JSON.parse(readFileSync("node_modules/viem/package.json", "utf8")).version;

async function rpc(method) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }) });
  return BigInt((await r.json()).result);
}

const only = process.argv.slice(2);
const scripts = readdirSync(".").filter((f) => /^\d\d-.*\.ts$/.test(f) && (only.length === 0 || only.some((o) => f.startsWith(o)))).sort();
mkdirSync("../evidence", { recursive: true });

for (const file of scripts) {
  const id = file.slice(0, 2);
  const startedAt = new Date().toISOString();
  const startBlock = await rpc("eth_blockNumber");
  const chainId = await rpc("eth_chainId");
  const res = spawnSync(process.execPath, ["--import", "tsx", file], { encoding: "utf8", timeout: 600_000 });
  const endBlock = await rpc("eth_blockNumber");
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`
    .split(/\r?\n/)
    .filter((l) => !/^Assertion failed: !\(handle->flags & UV_HANDLE_CLOSING\)/.test(l)) // libuv shutdown noise on Windows
    .join("\n")
    .trimEnd();
  const header = [
    `# Evidence for finding ${id}`,
    `# command      : npx tsx repro/${file}`,
    `# started (UTC): ${startedAt}`,
    `# chain id     : ${chainId} (Somnia Tokyo testnet / Hideki)`,
    `# head block   : ${startBlock} -> ${endBlock}`,
    `# rpc          : ${RPC}`,
    `# indexer      : ${INDEXER}`,
    `# versions     : @somnia-chain/markets-sdk ${sdk}, viem ${viem}, node ${process.version}`,
    `# mode         : read-only (chain reads, indexer reads, eth_call). Nothing signed or sent.`,
    "",
  ].join("\n");
  const name = file.replace(/\.ts$/, ".log");
  writeFileSync(`../evidence/${name}`, `${header}${out}\n`);
  console.log(`${name}: exit ${res.status}, ${out.split("\n").length} lines`);
}
