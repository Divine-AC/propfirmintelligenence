import { scoreAccount } from "./scoring";
import type { FirmAccount, TraderProfile } from "./types";
import type { TradeHistorySummary } from "../trading-history/types";

export type AccountAssessment = {
  account: FirmAccount;
  eligible: boolean;
  score: number | null;
  scoreCoveragePct: number;
  reasons: string[];
  warnings: string[];
  missingDecisionEvidence: string[];
  verifiedRuleCount: number;
  relevantRuleCount: number;
  historyObservations: string[];
  losingStreakScenario: { lossPct: number; dailyLimitPct: number; exceedsDailyLimit: boolean } | null;
  decisionReady: boolean;
};

export type AdvisorDecision = {
  account: FirmAccount | null;
  message: string;
  isPurchaseRecommendation: boolean;
};

export function estimateSequentialLossExposure(riskPerTradePct: number | null, losingTrades: number): number | null {
  if (riskPerTradePct === null || !Number.isFinite(riskPerTradePct) || riskPerTradePct <= 0 || losingTrades <= 0) return null;
  return (1 - (1 - riskPerTradePct / 100) ** losingTrades) * 100;
}

export function assessAccount(
  trader: TraderProfile,
  account: FirmAccount,
  history: TradeHistorySummary | null,
): AccountAssessment {
  const match = scoreAccount(trader, account);
  const ruleChecks = [
    account.accountSizeEvidence,
    account.price,
    account.evaluationPhases,
    account.profitTargetsPct,
    account.dailyLossLimitPct,
    account.overallLossLimitPct,
    account.lossCalculation,
    account.dailyReset,
    account.minimumTradingDays,
    account.timeLimit,
    account.drawdownType,
    account.newsRule,
    account.newsExecution,
    account.automationRule,
    account.weekendRule,
    account.consistencyDetails,
    account.supportedStyles,
    account.payoutTerms,
    account.profitSplit,
    account.feeTerms,
    account.otherRestrictions,
  ];
  const verifiedRuleCount = ruleChecks.filter((rule) => rule.status === "verified").length;
  const missing: string[] = [];
  const requireEvidence = (isRelevant: boolean, label: string, verified: boolean) => {
    if (isRelevant && !verified) missing.push(label);
  };
  requireEvidence(true, "entry price in the selected budget currency", account.price.status === "verified" && account.price.value !== null && account.priceCurrency === trader.budgetCurrency);
  requireEvidence(true, "account size", account.accountSizeEvidence.status === "verified" && account.accountSizeEvidence.value === account.accountSize);
  requireEvidence(true, "evaluation targets", account.evaluationPhases.status === "verified" && account.profitTargetsPct.status === "verified");
  requireEvidence(true, "daily and total loss calculations", account.dailyLossLimitPct.status === "verified" && account.overallLossLimitPct.status === "verified" && account.lossCalculation.status === "verified" && account.dailyReset.status === "verified");
  requireEvidence(true, "payout and fee conditions", account.payoutTerms.status === "verified" && account.profitSplit.status === "verified" && account.feeTerms.status === "verified");
  requireEvidence(true, "your selected trading style", account.supportedStyles.status === "verified");
  requireEvidence(trader.requiresWeekendHolding, "weekend holding rules", account.weekendRule.status === "verified");
  requireEvidence(trader.avoidsConsistencyRules, "consistency rule status", account.consistencyDetails.status === "verified");
  requireEvidence(trader.tradesNews, "news execution restrictions", account.newsRule.status === "verified");
  requireEvidence(trader.usesAutomation, "EA and automation conditions", account.automationRule.status === "verified");

  const historyObservations: string[] = [];
  if (history && history.tradeCount > 0) {
    historyObservations.push(`The imported sample contains ${history.tradeCount} closed trades with an average holding time of ${Math.round(history.averageHoldingMinutes)} minutes. Average duration does not establish whether positions crossed a market break.`);
    if (history.largestRealizedDailyLossPct !== null) {
      historyObservations.push(`The largest realized daily loss was ${history.largestRealizedDailyLossPct.toFixed(2)}% of the starting balance you entered. Firm daily-loss rules also include floating P/L and may use different reset mechanics, so this is a comparison point, not a replay or breach finding.`);
      if (account.dailyLossLimitPct.status === "verified" && account.dailyLossLimitPct.value !== null && history.largestRealizedDailyLossPct >= account.dailyLossLimitPct.value) {
        historyObservations.push(`That realized daily-loss sample is at or above this programme's ${account.dailyLossLimitPct.value}% daily limit before considering any floating loss.`);
      }
    }
    if (history.profitFactor !== null) historyObservations.push(`The sample profit factor is ${history.profitFactor.toFixed(2)}; it describes these trades only and does not estimate the probability of passing.`);
  }

  let losingStreakScenario: AccountAssessment["losingStreakScenario"] = null;
  if (history && history.maxLosingStreak > 0 && trader.riskPerTradePct !== null && account.dailyLossLimitPct.status === "verified" && account.dailyLossLimitPct.value !== null) {
    const lossPct = estimateSequentialLossExposure(trader.riskPerTradePct, history.maxLosingStreak);
    if (lossPct !== null) {
      losingStreakScenario = { lossPct, dailyLimitPct: account.dailyLossLimitPct.value, exceedsDailyLimit: lossPct >= account.dailyLossLimitPct.value };
      historyObservations.push(`Stress scenario: if the ${history.maxLosingStreak}-loss streak from your sample occurred in one day and each loss risked ${trader.riskPerTradePct}% of the then-current balance, compounded loss would be about ${lossPct.toFixed(2)}%. This assumes unchanged sizing and excludes gaps, slippage, commissions, swaps, and intratrade loss.`);
    }
  }

  return {
    account,
    eligible: match.eligible,
    score: match.score,
    scoreCoveragePct: match.scoreCoveragePct,
    reasons: match.reasons,
    warnings: match.warnings,
    missingDecisionEvidence: missing,
    verifiedRuleCount,
    relevantRuleCount: ruleChecks.length,
    historyObservations,
    losingStreakScenario,
    decisionReady: match.eligible && missing.length === 0,
  };
}

export function decidePrimaryRecommendation(assessments: AccountAssessment[]): AdvisorDecision {
  const candidates = assessments.filter((item) => item.decisionReady).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  if (candidates.length > 0) {
    return { account: candidates[0].account, message: "This is the highest-scoring account with the profile's material rules and costs documented. Review its trade-offs before purchase.", isPurchaseRecommendation: true };
  }
  const viable = assessments.filter((item) => item.eligible).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  if (viable.length === 0) return { account: null, message: "No researched account currently clears the profile's documented eligibility constraints. Consider changing the profile only if it reflects your real strategy, or expand the researched account set.", isPurchaseRecommendation: false };
  return { account: viable[0].account, message: `No purchase recommendation yet. ${viable[0].account.firmName} is only the strongest preliminary candidate; important evidence is still missing: ${viable[0].missingDecisionEvidence.join(", ")}.`, isPurchaseRecommendation: false };
}
