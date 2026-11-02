import type { FirmAccount, TraderProfile } from "./types";

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
};

export function checkEligibility(
  trader: TraderProfile,
  account: FirmAccount
): EligibilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (account.accountSize < trader.minimumAccountSize) {
    reasons.push(`Account size is below your minimum of $${trader.minimumAccountSize.toLocaleString()}.`);
  }

  if (account.priceCurrency !== trader.budgetCurrency) {
    warnings.push(`Price is listed in ${account.priceCurrency}; choose that currency to compare it with your budget.`);
  } else if (account.price.status === "verified" && account.price.value !== null) {
    if (account.price.value > trader.maxBudget) {
      reasons.push(`Price exceeds the trader's budget of ${trader.maxBudget}.`);
    }
  } else {
    warnings.push("Account fee is unverified; budget fit cannot be assessed.");
  }

  if (
    account.weekendHolding.status === "verified" &&
    trader.requiresWeekendHolding &&
    account.weekendHolding.value === "prohibited"
  ) {
    reasons.push("Weekend holding is required but prohibited by this account.");
  }

  if (trader.tradesNews && account.newsExecution.status !== "verified") {
    warnings.push("This account's news execution rules are unverified; the trader's news strategy cannot be checked.");
  } else if (trader.tradesNews && account.newsExecution.value === "restricted") {
    warnings.push("This strategy trades news and the account documents execution restrictions around selected events; review the phase-specific timing rule.");
  } else if (trader.tradesNews && account.newsExecution.value === "prohibited") {
    reasons.push("News execution is prohibited but the trader's profile requires it.");
  }

  if (trader.usesAutomation && account.automationRule.status !== "verified") {
    warnings.push("Automation or EA rules are unverified for this account.");
  } else if (trader.usesAutomation && account.automationRule.value === "restricted") {
    warnings.push("Automation is allowed only with documented restrictions; check that this strategy fits them.");
  } else if (trader.usesAutomation && account.automationRule.value === "prohibited") {
    reasons.push("The account prohibits automation used by the trader.");
  }

  if (
    account.drawdownType.status === "verified" &&
    account.drawdownType.value !== "unknown" &&
    trader.preferredDrawdown !== "either" &&
    account.drawdownType.value !== trader.preferredDrawdown
  ) {
    reasons.push("The account's drawdown model does not match the trader's preference.");
  }

  if (
    account.supportedStyles.status === "verified" &&
    !account.supportedStyles.value.includes(trader.tradingStyle)
  ) {
    reasons.push("The account does not support the trader's selected style.");
  }

  if (
    account.consistencyRule.status === "verified" &&
    trader.avoidsConsistencyRules &&
    account.consistencyRule.value === "present"
  ) {
    reasons.push("The trader wants to avoid consistency rules, but this account has one.");
  }

  if (account.drawdownType.status !== "verified" || account.drawdownType.value === "unknown") {
    warnings.push("Drawdown rule is unverified or unknown.");
  }
  if (account.weekendHolding.status !== "verified" || account.weekendHolding.value === "unknown") {
    warnings.push("Weekend holding restrictions are unverified or unknown.");
  }
  if (account.consistencyRule.status !== "verified" || account.consistencyRule.value === "unknown") {
    warnings.push("Consistency rule status is unverified or unknown.");
  }
  if (account.supportedStyles.status !== "verified") {
    warnings.push("Supported trading styles are unverified.");
  }
  return { eligible: reasons.length === 0, reasons, warnings };
}
