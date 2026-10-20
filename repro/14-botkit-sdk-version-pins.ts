// NORMAL-14: the bot kit's declared markets-sdk ranges vs the version the
// developer docs name (0.32.1). Reads the kit's package files at a fixed commit.
const COMMIT = "25798660bbe4674a6f83a960b202852896e2fed4";
const raw = (p: string) => `https://raw.githubusercontent.com/somnia-chain/dreamdex-bot-kit/${COMMIT}/${p}`;

// npm caret semantics for 0.x: ^0.MINOR.PATCH means >=0.MINOR.PATCH <0.(MINOR+1).0
function caretAllows(range: string, version: string): boolean {
  const [ma, mi, pa] = range.replace(/^\^/, "").split(".").map(Number);
  const [vma, vmi, vpa] = version.split(".").map(Number);
  if (ma !== 0) return vma === ma && (vmi > mi || (vmi === mi && vpa >= pa));
  return vma === 0 && vmi === mi && vpa >= pa;
}

console.log(`dreamdex-bot-kit @ ${COMMIT}`);
for (const p of ["packages/perp-core/package.json", "packages/ec-core/package.json"]) {
  const pkg = await (await fetch(raw(p))).json();
  const range = pkg.dependencies?.["@somnia-chain/markets-sdk"];
  console.log(`${p.padEnd(34)} "@somnia-chain/markets-sdk": "${range}"  -> allows 0.32.1? ${caretAllows(range, "0.32.1") ? "yes" : "NO"}`);
}
const lock = await (await fetch(raw("package-lock.json"))).json();
for (const [k, v] of Object.entries<any>(lock.packages)) {
  if (k.endsWith("node_modules/@somnia-chain/markets-sdk")) console.log(`package-lock.json  ${k.padEnd(58)} ${v.version}`);
}
const reg = await (await fetch("https://registry.npmjs.org/@somnia-chain/markets-sdk")).json();
console.log(`npm registry: latest = ${reg["dist-tags"].latest}; 0.32.1 published ${reg.time["0.32.1"]}`);
process.exit(0);
