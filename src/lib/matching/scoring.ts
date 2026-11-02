import type { FirmAccount, TraderProfile } from "./types";
import { checkEligibility } from "./eligibility";

export type MatchWeights = {
  tradingStyle: number;
  holdingAndSession: number;
  drawdownFit: number;
  payoutAndConsistency: number;
  costAndPreferences: number;
};

export const MATCH_WEIGHTS: MatchWeights = {
  tradingStyle: 25,
  holdingAndSession: 20,
  drawdownFit: 25,
  payoutAndConsistency: 15,
  costAndPreferences: 15,
} as const;

function verifiedWeightCoverage(trader: TraderProfile, account: FirmAccount, weights: MatchWeights): number {
  let points = 0;
  if (account.drawdownType.status === "verified") points += weights.drawdownFit;
  if (account.supportedStyles.status === "verified") points += weights.tradingStyle;
  if (account.weekendHolding.status === "verified") points += weights.holdingAndSession;
  if (account.consistencyRule.status === "verified") points += weights.payoutAndConsistency;
  if (account.priceCurrency === trader.budgetCurrency && account.price.status === "verified" && account.price.value !== null) points += weights.costAndPreferences;
  return points;
}

export function scoreAccount(trader: TraderProfile, account: FirmAccount, weights: MatchWeights = MATCH_WEIGHTS) {
  const eligibility = checkEligibility(trader, account);
  if (!eligibility.eligible) {
    return { eligible: false, score: null, scoreCoveragePct: verifiedWeightCoverage(trader, account, weights), reasons: eligibility.reasons, warnings: eligibility.warnings };
  }

  let earnedPoints = 0;
  let availablePoints = 0;
  const reasons: string[] = [];
  const warnings = [...eligibility.warnings];

  if (account.drawdownType.status === "verified") {
    availablePoints += weights.drawdownFit;
    if (trader.preferredDrawdown === "either" || account.drawdownType.value === trader.preferredDrawdown) {
      earnedPoints += weights.drawdownFit;
      reasons.push("Drawdown model matches your preference.");
    } else reasons.push("Drawdown model does not match your preference.");
  }
  if (account.supportedStyles.status === "verified") {
    availablePoints += weights.tradingStyle;
    if (account.supportedStyles.value.includes(trader.tradingStyle)) {
      earnedPoints += weights.tradingStyle;
      reasons.push("Your trading style is supported.");
    } else reasons.push("Your trading style is not supported.");
  }
  if (account.weekendHolding.status === "verified") {
    availablePoints += weights.holdingAndSession;
    if (!trader.requiresWeekendHolding || account.weekendHolding.value === "allowed") {
      earnedPoints += weights.holdingAndSession;
      reasons.push("Weekend holding requirements fit your profile.");
    } else reasons.push("Weekend holding requirements do not fit your profile.");
  }
  if (account.consistencyRule.status === "verified") {
    availablePoints += weights.payoutAndConsistency;
    if (!trader.avoidsConsistencyRules || account.consistencyRule.value === "absent") {
      earnedPoints += weights.payoutAndConsistency;
      reasons.push("Consistency-rule preference is satisfied.");
    } else reasons.push("Consistency rules conflict with your preference.");
  }
  if (account.priceCurrency === trader.budgetCurrency && account.price.status === "verified" && account.price.value !== null) {
    availablePoints += weights.costAndPreferences;
    earnedPoints += weights.costAndPreferences;
    reasons.push("Verified account fee fits your budget.");
  }

  const score = availablePoints === 0 ? null : Math.round((earnedPoints / availablePoints) * 100);
  if (availablePoints < 100) {
    warnings.push("This score uses only verified criteria; unverified criteria are excluded.");
  }
  return { eligible: true, score, scoreCoveragePct: availablePoints, reasons, warnings };
}

export function rankAccounts(trader: TraderProfile, accounts: FirmAccount[], weights: MatchWeights = MATCH_WEIGHTS) {
  return accounts
    .map((account) => ({ account, ...scoreAccount(trader, account, weights) }))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return (b.score ?? -1) - (a.score ?? -1);
    });
}
