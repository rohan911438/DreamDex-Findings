// NORMAL-24: the developer docs say "The full list of order errors is on the
// Errors page", but that page documents SpotPool and SpotStopOrderRegistry
// errors only. This lists the perp-path errors observed in this review (all
// present in the SDK's error ABI) against the names documented on the page.
import { contractErrorsAbi } from "@somnia-chain/markets-sdk";
import { toFunctionSelector } from "viem";

// Every error name in the tables of /docs/developers/contracts/errors (2026-10-20).
const ON_ERRORS_PAGE = new Set([
  "InvalidPrice", "InvalidQuantity", "QuantityBelowMinimum", "InvalidAmount", "PriceTooLarge", "InvalidTakerSide", "ZeroQuoteFillsAllowed",
  "OrderAlreadyExpired", "SelfMatchCancelTaker", "PostOnlyWouldCross", "FillOrKillNotFillable", "ImmediateOrCancelNoFill",
  "InsufficientBalance", "UseDepositNative", "UnexpectedNativeDeposit", "InvalidMsgValue", "NativeTokenTransferFailed", "InvalidDepositOrWithdrawal",
  "InsufficientGasForPayout", "ExpiredOrderMustBeCancelled", "OrderIdMismatch", "IncorrectOrder", "IncorrectSender", "EmptyBatch",
  "AmendReplacementRejected", "AmendOldOrderGone", "OnlyApprovedContracts", "OwnableUnauthorizedAccount", "BuilderCodesNotSupported",
  "InvalidBuilder", "BuilderNotApproved", "BuilderFeeExceedsApproval", "BuilderFeeExceedsCap", "FeeTooHigh", "AmendReplacementFailed",
  "InvalidTickSize", "InvalidLotSize", "InvalidMinQuantity", "InconsistentMinQuantityAndLotSize", "InvalidFeeRecipient",
  "InvalidMidpointEmaParameters", "InvalidOperatorPermissionsRegistry", "InsufficientSomiPayment", "NoActiveSubscription",
  "TriggerTooCloseToEma", "LimitPriceIncompatibleWithTrigger", "InvalidLimitPrice", "InvalidTriggerPrice", "PriceNotAlignedToTickSize",
  "QuantityNotAlignedToLotSize", "InsufficientVaultBalance", "InvalidOrderOwner", "OrderDoesNotExist", "NothingToClaim", "SubscriptionStillActive",
]);
// Errors this review hit on the perp path (PerpPool, MarginBank, PerpStopOrderRegistry).
const OBSERVED = [
  ["MaxPositionSizeExceeded", "PerpPool placeOrder over the per-account cap (MAJOR-01)"],
  ["InsufficientMarginForOrder", "PerpPool placeOrder over the margin limit"],
  ["FillPriceOutsideBand", "PerpPool fill too far from the mark"],
  ["InsufficientCollateral", "placeOrderFor with a wrongly scaled quantity (named on the perps page)"],
  ["IsolatedMarketBlocked", "isolated account ordering in another market (named on the perps page)"],
  ["NoReducingPositionAtCreation", "PerpStopOrderRegistry: reduce-only stop on the wrong side (MAJOR-04)"],
  ["RegistryNotApprovedByOwner", "PerpStopOrderRegistry: operator grant missing"],
  ["InsufficientMarginAfterWithdrawal", "MarginBank.withdraw above the margin limit (MAJOR-18)"],
  ["WithdrawalBelowCreditFloor", "MarginBank.withdraw into paper USDso (NORMAL-19)"],
];
const byName = new Map<string, any>();
for (const e of contractErrorsAbi as any[]) if (!byName.has(e.name) || e.inputs.length) byName.set(e.name, e);
let missing = 0;
console.log("error                               selector     in SDK ABI  on Errors page  seen when");
for (const [name, when] of OBSERVED) {
  const e = byName.get(name);
  const selector = e ? toFunctionSelector(`function ${name}(${e.inputs.map((i: any) => i.type).join(",")})`) : "-";
  const onPage = ON_ERRORS_PAGE.has(name);
  if (!onPage) missing++;
  console.log(`${name.padEnd(35)} ${selector}   ${e ? "yes" : "no "}         ${onPage ? "yes" : "NO "}             ${when}`);
}
console.log(`\n${missing} of ${OBSERVED.length} perp-path errors are not on the Errors page`);
process.exit(0);
