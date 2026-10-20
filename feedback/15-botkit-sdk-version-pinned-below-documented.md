# Bot kit pins markets-sdk ^0.31.0 (and ^0.30.0), which can never resolve to the 0.32.1 the docs say the app runs
Severity: normal
Area: SDK

The developer docs build against `@somnia-chain/markets-sdk` 0.32.1, "the one the app runs". The bot kit, which the same docs point bot builders to, declares:

- `packages/perp-core/package.json`: `"@somnia-chain/markets-sdk": "^0.31.0"`
- `packages/ec-core/package.json`: `"@somnia-chain/markets-sdk": "^0.30.0"`

Under npm semver a caret range on a `0.x` version allows only patch updates, so `^0.31.0` means `>=0.31.0 <0.32.0` and can't install 0.32.x. The committed lockfile resolves 0.31.0 for perp-core and 0.30.0 at the root, so two different SDK versions end up in one install. Behaviour documented for 0.32.1 isn't guaranteed in the kit.

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit` (commit `2579866`)
2. `grep -n markets-sdk packages/*/package.json`
3. `node -e 'const l=require("./package-lock.json");for(const[k,v]of Object.entries(l.packages))if(k.endsWith("@somnia-chain/markets-sdk"))console.log(k,v.version)'`

## Expected
The kit depends on the documented SDK version (`^0.32.1`, or an exact `0.32.1`), with one SDK copy per install.

## Actual
```
node_modules/@somnia-chain/markets-sdk 0.30.0
packages/perp-core/node_modules/@somnia-chain/markets-sdk 0.31.0
```

## Environment
dreamdex-bot-kit `main` @ `2579866`; npm 11.
