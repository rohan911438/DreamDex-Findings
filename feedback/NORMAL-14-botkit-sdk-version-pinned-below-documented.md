# NORMAL-14 · Bot kit pins `markets-sdk` `^0.31.0` / `^0.30.0`, which can never install the documented 0.32.1
Severity: normal
Area: SDK

| | |
|---|---|
| **Component** | dreamdex-bot-kit `packages/perp-core/package.json`, `packages/ec-core/package.json`, `package-lock.json` @ `2579866` |
| **Affects** | Every bot built from the kit |
| **Reproduce** | `npx tsx repro/14-botkit-sdk-version-pins.ts` (reads the kit's files at the fixed commit and the npm registry) |
| **Evidence** | [`evidence/14-botkit-sdk-version-pins.log`](../evidence/14-botkit-sdk-version-pins.log) |

## Summary

The developer docs build against `@somnia-chain/markets-sdk` **0.32.1**, "the one the app runs", and send bot builders to the kit. The kit declares:

| File | Range |
|---|---|
| `packages/perp-core/package.json` | `"@somnia-chain/markets-sdk": "^0.31.0"` |
| `packages/ec-core/package.json` | `"@somnia-chain/markets-sdk": "^0.30.0"` |

Under npm semver a caret range on a `0.x` version allows patch updates only (`^0.31.0` = `>=0.31.0 <0.32.0`), so neither range can install 0.32.x. The committed lockfile resolves **two** SDK copies in one install, 0.30.0 at the root and 0.31.0 under perp-core. Behaviour documented for 0.32.1 isn't guaranteed in the kit, and the two copies can disagree with each other.

## Steps to reproduce

1. `cd repro && npm install && npx tsx 14-botkit-sdk-version-pins.ts`

or by hand:

1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && git checkout 2579866`
2. `grep -n markets-sdk packages/*/package.json`
3. `node -e 'const l=require("./package-lock.json");for(const[k,v]of Object.entries(l.packages))if(k.endsWith("@somnia-chain/markets-sdk"))console.log(k,v.version)'`

## Expected

The kit depends on the version the docs name (`^0.32.1` or an exact `0.32.1`) and resolves a single SDK copy.

## Actual

```
packages/perp-core/package.json    "@somnia-chain/markets-sdk": "^0.31.0"  -> allows 0.32.1? NO
packages/ec-core/package.json      "@somnia-chain/markets-sdk": "^0.30.0"  -> allows 0.32.1? NO
package-lock.json  node_modules/@somnia-chain/markets-sdk                     0.30.0
package-lock.json  packages/perp-core/node_modules/@somnia-chain/markets-sdk  0.31.0
npm registry: latest = 0.32.1; 0.32.1 published 2026-10-13T09:04:28.229Z
```

## Evidence

- Log: [`evidence/14-botkit-sdk-version-pins.log`](../evidence/14-botkit-sdk-version-pins.log)

## Suggested fix

Bump both packages to `^0.32.1`, regenerate the lockfile, and add a CI check that the kit's SDK version matches the one the docs name.

## Environment

Bot kit `somnia-chain/dreamdex-bot-kit` @ `25798660bbe4674a6f83a960b202852896e2fed4` · npm 11 · npm registry as of 2026-10-20.
