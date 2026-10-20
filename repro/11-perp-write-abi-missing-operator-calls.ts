// The developer docs tell raw callers to use placeOrderFor / placeOrdersFor /
// amendOrders on the perp pool, but the SDK's exported perpPoolWriteAbi only
// carries placeOrder, cancelOrder, updateFunding and marginBank.
import * as sdk from "@somnia-chain/markets-sdk";

const fnNames = (abi: readonly any[]) => abi.filter((x) => x.type === "function").map((x) => x.name);
console.log("perpPoolWriteAbi functions:", fnNames(sdk.perpPoolWriteAbi).join(", "));
for (const name of ["placeOrderFor", "placeOrdersFor", "cancelOrderFor", "amendOrders", "getOrderBookParameters"]) {
  const where = Object.entries(sdk)
    .filter(([k, v]) => k.endsWith("Abi") && Array.isArray(v) && fnNames(v as any[]).includes(name))
    .map(([k]) => k);
  console.log(`${name.padEnd(24)} in perpPoolWriteAbi: ${fnNames(sdk.perpPoolWriteAbi).includes(name) ? "yes" : "NO"}; exported in: ${where.join(", ") || "(no exported ABI)"}`);
}
process.exit(0);
