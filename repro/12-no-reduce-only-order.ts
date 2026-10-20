// There is no reduce-only flag for regular perp orders: not on PerpPool.placeOrder,
// not on trader.placePerpOrder, and the unified createOrder has no reduceOnly
// param (a ccxt-style { reduceOnly: true } is silently ignored). Only stop
// orders can be reduce-only.
import * as sdk from "@somnia-chain/markets-sdk";

const place = sdk.perpPoolWriteAbi.find((x: any) => x.type === "function" && x.name === "placeOrder") as any;
console.log("PerpPool.placeOrder inputs:", place.inputs.map((i: any) => `${i.type} ${i.name}`).join(", "));
console.log("has a reduce-only input:", place.inputs.some((i: any) => /reduce/i.test(i.name)) ? "yes" : "NO");
console.log("ORDER_TYPE values:", JSON.stringify(sdk.ORDER_TYPE));
process.exit(0);
