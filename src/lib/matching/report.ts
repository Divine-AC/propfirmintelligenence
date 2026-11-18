import { assessAccount, decidePrimaryRecommendation, estimateSequentialLossExposure, type AccountAssessment, type AdvisorDecision } from "./advisory";
import type { FirmAccount, TraderProfile } from "./types";
import type { TradeHistorySummary } from "../trading-history/types";

export type RuleBreakdownItem = {
  id: string;
  title: string;
  status: "verified" | "unverified";
  sourceUrl?: string;
  verifiedAt?: string;
  riskLevel: "low" | "moderate" | "elevated" | "unverified";
  whatTheRuleSays: string;
  whatItMeansInPractice: string;
  whatItMeansForYou: string;
  howToManageIt: string;
};

export type AlternativeAccountComparison = {
  account: FirmAccount;
  assessment: AccountAssessment;
  whatMakesItAttractive: string;
  satisfiedRequirements: string[];
  whyItRanksLower: string;
  disadvantageSeverity: "deal_breaker" | "material_trade_off" | "evidence_gap";
  whenToReconsider: string;
};

export type CostComparisonRow = {
  accountId: string;
  firmName: string;
  programmeName: string;
  accountSize: number;
  priceCurrency: "USD" | "EUR";
  entryPrice: number | null;
  basePrice: number | null;
  maxDrawdownDollar: number | null;
  costPer1kDrawdown: number | null;
  profitSplit: string;
  refundSummary: string;
  isRecommended: boolean;
  tradeOffNote: string;
};

export type EvidenceAuditEntry = {
  ruleLabel: string;
  valueSummary: string;
  status: "verified" | "unverified";
  sourceUrl?: string;
  verifiedAt?: string;
  operationalNote?: string;
};

export type AdvisoryReport = {
  generatedAtIso: string;
  executiveRecommendation: {
    verdict: "recommended" | "preliminary_candidate" | "no_suitable_account";
    headline: string;
    executiveNarrative: string;
    primaryAccount: FirmAccount | null;
    primaryAssessment: AccountAssessment | null;
    suitabilityScore: number | null;
    evidenceCoveragePct: number;
    ninePointThesis: {
      firmAndProgramme: string;
      sizeAndPrice: string;
      strategyFit: string;
      drawdownFit: string;
      operationalRestrictionsInteraction: string;
      historyStrengthsAndVulnerabilities: string;
      evaluationAndPayoutFit: string;
      knownDisadvantages: string;
      confidenceAndEvidence: string;
    };
  };
  ruleBreakdowns: RuleBreakdownItem[];
  riskAndScenarioAnalysis: {
    dailyLossBuffer: {
      accountDailyLimitPct: number | null;
      accountDailyLimitAmount: number | null;
      traderRiskPerTradePct: number | null;
      consecutiveLossesToBreachDaily: number | null;
      observedMaxLosingStreak: number | null;
      streakCompoundedLossPct: number | null;
      observedLargestDailyLossPct: number | null;
      status: "comfortable" | "tight" | "breach_risk" | "insufficient_data";
      explanation: string;
      recommendedDailyStopProtocol: string;
    };
    overallDrawdownBuffer: {
      accountOverallLimitPct: number | null;
      accountOverallLimitAmount: number | null;
      drawdownType: string;
      observedMaxBalanceDrawdownPct: number | null;
      observedSampledEquityDrawdownPct: number | null;
      explanation: string;
    };
    consistencyCheck: {
      accountConsistencyRule: string;
      observedBestDaySharePct: number | null;
      observedTopThreeTradesSharePct: number | null;
      wouldTriggerDelay: boolean;
      explanation: string;
    };
    holdingAndExecutionCheck: {
      observedAvgHoldMinutes: number | null;
      observedOvernightTrades: number | null;
      observedWeekendTrades: number | null;
      observedSub30sTrades: number | null;
      explanation: string;
    };
    purchaseReadinessVerdict: {
      readyToPurchaseNow: "yes_with_discipline" | "caution_refine_first" | "no_unproven_or_incompatible";
      headline: string;
      rationale: string[];
    };
  };
  alternativesAnalysis: AlternativeAccountComparison[];
  financialTradeOffAnalysis: {
    entryPriceFormatted: string;
    basePriceFormatted: string | null;
    isPromotionalPrice: boolean;
    simulatedCapitalFormatted: string;
    maxDrawdownRoomAmount: number | null;
    costPerThousandDrawdownRoom: number | null;
    refundPolicy: string;
    recurringAndActivationFees: string;
    profitSplitAndPayouts: string;
    financialDownsideIfBreached: string;
    cheapestVsBestFitVerdict: string;
    comparisonRows: CostComparisonRow[];
  };
  evidenceAuditLog: {
    researchSnapshotDate: string;
    verifiedCount: number;
    totalRulesChecked: number;
    unresolvedConflictsAndGaps: string[];
    entries: EvidenceAuditEntry[];
  };
  finalDecisionSummary: {
    recommendationHeadline: string;
    keyReasonsToChoose: string[];
    criticalRisksToRespect: string[];
    prePurchaseChecklist: string[];
  };
};

function formatCurrency(amount: number, currency: "USD" | "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildRuleBreakdowns(
  account: FirmAccount,
  trader: TraderProfile,
  history: TradeHistorySummary | null
): RuleBreakdownItem[] {
  const dailyPct = account.dailyLossLimitPct.value;
  const dailyDollar = dailyPct !== null ? (account.accountSize * dailyPct) / 100 : null;
  const overallPct = account.overallLossLimitPct.value;
  const overallDollar = overallPct !== null ? (account.accountSize * overallPct) / 100 : null;
  const riskPct = trader.riskPerTradePct;
  const lossesToBreachDaily =
    dailyPct !== null && riskPct !== null && riskPct > 0 ? Math.floor(dailyPct / riskPct) : null;

  // 1. Daily Loss Limit
  const dailyRule: RuleBreakdownItem = {
    id: "daily-loss",
    title: `Daily Loss Allowance (${dailyPct !== null ? `${dailyPct}% · ${formatCurrency(dailyDollar!, "USD")}` : "Unverified"})`,
    status: account.dailyLossLimitPct.status === "verified" && account.lossCalculation.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.dailyLossLimitPct.sourceUrl ?? account.lossCalculation.sourceUrl,
    verifiedAt: account.dailyLossLimitPct.verifiedAt ?? account.lossCalculation.verifiedAt,
    riskLevel:
      dailyPct !== null && dailyPct <= 3
        ? "elevated"
        : dailyPct !== null && riskPct !== null && dailyPct / riskPct < 4
        ? "moderate"
        : "low",
    whatTheRuleSays:
      account.lossCalculation.value ??
      `Daily loss allowance is ${dailyPct ?? "unspecified"}%. Official calculation details are not fully verified.`,
    whatItMeansInPractice:
      account.firmName === "FTMO"
        ? `At ${account.dailyReset.value ?? "00:00 CE(S)T"}, your daily loss floor resets based on the previous day's closing balance (${dailyPct}% of initial $${account.accountSize.toLocaleString("en-US")} capital = $${dailyDollar?.toLocaleString("en-US")}). Critically, closed trades, open floating drawdowns, commissions, and overnight swaps all count against this floor in real time.`
        : account.firmName === "The5ers" || account.firmName === "BrightFunded"
        ? `At ${account.dailyReset.value ?? "daily rollover"}, the ${dailyPct}% daily limit is recalculated from the HIGHER of your prior closing balance or floating equity. If you carry an open winning trade with unrealized profit across the ${account.dailyReset.value ?? "00:00"} rollover, your new daily floor locks in higher—meaning a pullback in that open trade can breach the daily limit even before reaching entry.`
        : `Your daily loss allowance begins at ${dailyPct}% ($${dailyDollar?.toLocaleString("en-US")}) and resets at ${account.dailyReset.value ?? "midnight server time"}. Both realized losses and intratrade floating equity dips (inclusive of commissions and swaps) trigger an immediate hard breach if equity touches the daily floor.`,
    whatItMeansForYou:
      riskPct !== null && dailyPct !== null
        ? `At your stated risk of ${riskPct}% per trade ($${((account.accountSize * riskPct) / 100).toLocaleString("en-US")} per setup), the ${dailyPct}% daily limit gives you an absolute ceiling of ${ (dailyPct / riskPct).toFixed(1) }R before commissions and slippage.${
            history && history.maxLosingStreak > 0
              ? ` Your uploaded trade history shows a maximum losing streak of ${history.maxLosingStreak} consecutive losses${
                  history.largestRealizedDailyLossPct !== null
                    ? ` and a largest realized daily loss of ${history.largestRealizedDailyLossPct.toFixed(2)}%`
                    : ""
                }.${
                  lossesToBreachDaily !== null && history.maxLosingStreak >= lossesToBreachDaily
                    ? ` If a ${history.maxLosingStreak}-trade losing streak occurred within a single session at ${riskPct}% risk, it would breach this ${dailyPct}% daily limit.`
                    : ` Even if your historical ${history.maxLosingStreak}-loss streak occurred in a single day, it would remain inside the ${dailyPct}% limit provided intratrade slippage and concurrent exposure are controlled.`
                }`
              : ""
          }`
        : `Because you have not specified an exact risk percentage per trade, we cannot calculate how many consecutive stop-outs equal the ${dailyPct ?? "?"}% daily limit.${
            history?.largestRealizedDailyLossPct !== null && history?.largestRealizedDailyLossPct !== undefined
              ? ` However, your historical sample shows a peak realized daily loss of ${history.largestRealizedDailyLossPct.toFixed(2)}% (excluding intratrade floating drawdown).`
              : ""
          }`,
    howToManageIt:
      dailyPct !== null && riskPct !== null && riskPct > 0
        ? `Enforce a hard personal daily stop-loss at ${Math.min(dailyPct - 1, Math.max(riskPct * 2, dailyPct * 0.6)).toFixed(2)}% (${Math.max(1, Math.floor((dailyPct - 0.75) / riskPct))} full losing trade(s) in a single day). Leave at least 0.75%–1.0% buffer for commissions, spread widening, and floating excursion.${
            account.firmName === "The5ers" || account.firmName === "BrightFunded"
              ? " Because daily reset uses the higher of balance or equity, avoid holding large unrealized winners across the 00:00 rollover without locking in partial profits."
              : ""
          }`
        : `Cap per-trade risk at 0.50%–0.75% of initial balance and stop trading for the day after 2 consecutive losses so floating losses and commissions never approach the ${dailyPct ?? 5}% boundary.`,
  };

  // 2. Maximum Overall Loss & Drawdown Model
  const drawdownRule: RuleBreakdownItem = {
    id: "overall-drawdown",
    title: `Maximum Overall Loss (${overallPct !== null ? `${overallPct}% · ${account.drawdownType.value.toUpperCase()}` : "Unverified"})`,
    status: account.overallLossLimitPct.status === "verified" && account.drawdownType.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.drawdownType.sourceUrl ?? account.overallLossLimitPct.sourceUrl,
    verifiedAt: account.drawdownType.verifiedAt ?? account.overallLossLimitPct.verifiedAt,
    riskLevel: account.drawdownType.value === "trailing" ? "moderate" : "low",
    whatTheRuleSays:
      account.drawdownType.value === "static"
        ? `The maximum overall loss limit is a static ${overallPct}% ($${overallDollar?.toLocaleString("en-US")}) below the initial $${account.accountSize.toLocaleString("en-US")} starting balance (hard equity floor at $${(account.accountSize - (overallDollar ?? 0)).toLocaleString("en-US")}).`
        : account.drawdownType.value === "trailing"
        ? `The ${overallPct}% ($${overallDollar?.toLocaleString("en-US")}) maximum loss limit trails upward based on your highest End-of-Day (EOD) closed balance and never moves down.`
        : "The overall drawdown structure for this account is unverified.",
    whatItMeansInPractice:
      account.drawdownType.value === "static"
        ? `Because the floor stays fixed at $${(account.accountSize - (overallDollar ?? 0)).toLocaleString("en-US")}, every dollar of realized profit you bank increases your real drawdown cushion. If you grow the account by +4%, you now have ${(overallPct ?? 10) + 4}% of total room above the static floor.`
        : `Under FTMO 1-Step's EOD trailing rule, while it does not trail intratrade floating highs like intraday futures prop firms, banking a higher closing balance at 00:00 CE(S)T permanently raises your minimum account floor. Furthermore, withdrawing profits on a funded trailing account without leaving buffer can compress remaining drawdown room.`,
    whatItMeansForYou:
      history && history.maximumBalanceDrawdownPct !== null
        ? `Your imported trade history shows an observed balance drawdown of ${history.maximumBalanceDrawdownPct.toFixed(2)}%${
            history.maximumSampledEquityDrawdownPct !== null && history.maximumSampledEquityDrawdownPct !== undefined
              ? ` (and sampled equity drawdown of ${history.maximumSampledEquityDrawdownPct.toFixed(2)}%)`
              : " (intratrade floating drawdown was not present in the CSV)"
          } against this account's ${overallPct}% maximum allowance.${
            account.drawdownType.value === "static"
              ? " A static floor gives your strategy room to absorb normal multi-day pullbacks after profitable runs."
              : " Because this account uses an EOD trailing floor, multi-day givebacks after a new balance high are penalized more strictly than on a static 2-Step account."
          }`
        : `Your profile specifies ${trader.preferredDrawdown === "either" ? "flexibility on drawdown type" : `a preference for ${trader.preferredDrawdown} drawdown`}. With $${overallDollar?.toLocaleString("en-US")} in initial maximum loss capacity, your true risk capital is $${overallDollar?.toLocaleString("en-US")}, not the nominal $${account.accountSize.toLocaleString("en-US")} headline size.`,
    howToManageIt:
      account.drawdownType.value === "static"
        ? `Treat the $${overallDollar?.toLocaleString("en-US")} maximum drawdown as your true risk bankroll. If your account drops by ${(overallPct ?? 10) / 2}% (-$${((overallDollar ?? 0) / 2).toLocaleString("en-US")}), step down per-trade risk by 50% until you recover half of the drawdown.`
        : `On an EOD trailing account, avoid oversized position scaling immediately after setting a new end-of-day balance peak, because your loss floor has just ratcheted upward by the exact amount of yesterday's gain.`,
  };

  // 3. Evaluation Phases, Profit Targets & Minimum Days
  const targetsText = account.profitTargetsPct.value ? account.profitTargetsPct.value.map((t) => `${t}%`).join(" then ") : "Unverified";
  const phasesRule: RuleBreakdownItem = {
    id: "evaluation-targets",
    title: `Evaluation Structure (${account.evaluationPhases.value ?? "?"}-Phase · Target ${targetsText})`,
    status:
      account.evaluationPhases.status === "verified" &&
      account.profitTargetsPct.status === "verified" &&
      account.minimumTradingDays.status === "verified"
        ? "verified"
        : "unverified",
    sourceUrl: account.evaluationPhases.sourceUrl ?? account.profitTargetsPct.sourceUrl,
    verifiedAt: account.evaluationPhases.verifiedAt ?? account.profitTargetsPct.verifiedAt,
    riskLevel: "low",
    whatTheRuleSays: `Requires passing ${account.evaluationPhases.value ?? "?"} evaluation phase(s) with profit target(s) of ${targetsText}. Minimum trading days: ${account.minimumTradingDays.value ?? "unverified"}. Time limit: ${account.timeLimit.value ?? "unverified"}.`,
    whatItMeansInPractice:
      account.firmName === "The5ers"
        ? `Although the calendar time limit is unlimited (subject to a 30-day inactivity expiry), the minimum day rule requires 3 PROFITABLE days per phase—meaning days that close with net positive profit under the programme's definition, not merely days where you open and close a micro-lot.`
        : `With an unlimited calendar time limit, there is zero deadline pressure to force sub-optimal setups. You must complete ${account.minimumTradingDays.value ?? "the required minimum days"} before transitioning phases.`,
    whatItMeansForYou: `At your cadence of ~${trader.tradesPerWeek} trades per week${
      history && history.averageTradesPerActiveWeek !== null
        ? ` (your CSV history averages ${history.averageTradesPerActiveWeek.toFixed(1)} trades per active week)`
        : ""
    }, ${
      account.timeLimit.value?.toLowerCase().includes("30-day inactivity")
        ? "you easily avoid the 30-day inactivity expiration while taking only A-grade setups."
        : "you can execute at your natural pace without artificial monthly deadlines."
    }`,
    howToManageIt: `Ignore calendar speed entirely. Calculate how many R-multiples are required to hit ${targetsText} at your risk per trade (${
      riskPct && account.profitTargetsPct.value?.[0]
        ? `+${(account.profitTargetsPct.value[0] / riskPct).toFixed(1)}R net for Phase 1`
        : "e.g., +16R to +20R at 0.5% risk"
    }) and treat the evaluation as a 6-to-12-week campaign.`,
  };

  // 4. Overnight & Weekend Holding
  const holdingRule: RuleBreakdownItem = {
    id: "holding-weekend",
    title: `Overnight & Weekend Holding (${account.weekendHolding.value.toUpperCase()})`,
    status: account.weekendRule.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.weekendRule.sourceUrl,
    verifiedAt: account.weekendRule.verifiedAt,
    riskLevel:
      account.weekendRule.status !== "verified"
        ? "unverified"
        : trader.requiresWeekendHolding && account.firmName === "FTMO"
        ? "elevated"
        : "low",
    whatTheRuleSays: account.weekendRule.value ?? "Weekend and overnight holding terms are not confirmed in the inspected official sources for this plan.",
    whatItMeansInPractice:
      account.firmName === "FTMO"
        ? "CRITICAL PHASE TRANSITION: While weekend holding is permitted during the FTMO Challenge evaluation, a Standard funded FTMO Account requires closing positions before market breaks lasting longer than 2 hours (including weekends and holiday closures). Only FTMO's 2-Step Swing account type removes this funded-stage restriction."
        : account.weekendHolding.value === "allowed"
        ? "You may keep positions open overnight and through the weekend in both evaluation and funded stages. However, triple-swap rollover charges (typically Wednesday or Friday depending on instrument) and Friday-to-Sunday opening price gaps directly impact your floating equity and daily loss floor."
        : "Because official documentation did not unambiguously confirm weekend holding for this exact plan, you must assume weekend positions may be auto-liquidated or restricted until verified.",
    whatItMeansForYou: `${
      trader.requiresWeekendHolding
        ? "You indicated that your strategy requires holding positions over weekends."
        : "Your profile states that you do not require weekend holding."
    }${
      history
        ? ` In your imported history (${history.tradeCount} trades), your average hold duration is ${Math.round(history.averageHoldingMinutes)} minutes, with ${history.overnightTradesCount ?? 0} overnight rollover trade(s) and ${history.weekendTradesCount ?? 0} weekend-crossing trade(s).`
        : ""
    }${
      account.firmName === "FTMO" && (trader.requiresWeekendHolding || (history?.weekendTradesCount ?? 0) > 0)
        ? " Pay close attention to FTMO's Standard funded-account 2-hour market-break rule if your strategy holds across Friday close."
        : ""
    }`,
    howToManageIt:
      trader.requiresWeekendHolding || (history?.weekendTradesCount ?? 0) > 0
        ? "Before holding into Friday close, verify that your floating equity has at least 2.5% clearance above the daily loss floor to absorb Sunday open spread widening and weekend gap risk."
        : "Maintain a strict Friday 20:00 UTC flat deadline to eliminate weekend gap exposure and rollover swap drag completely.",
  };

  // 5. News Trading
  const newsRule: RuleBreakdownItem = {
    id: "news-trading",
    title: `News Trading & Release Windows (${account.newsExecution.value.toUpperCase()})`,
    status: account.newsRule.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.newsRule.sourceUrl,
    verifiedAt: account.newsRule.verifiedAt,
    riskLevel: trader.tradesNews ? "elevated" : "low",
    whatTheRuleSays: account.newsRule.value ?? "News execution restrictions are unverified for this programme.",
    whatItMeansInPractice:
      account.firmName === "FTMO"
        ? "During the evaluation phase(s), news execution is unrestricted. Once funded on a Standard FTMO Account, opening or closing market/pending orders (including stop-loss or take-profit fills!) on affected instruments within 2 minutes before to 2 minutes after selected high-impact releases is prohibited."
        : account.firmName === "FundedNext"
        ? "During the Challenge, news execution is allowed. On a funded Stellar account, profitable trades executed within 5 minutes before or after a correlated high-impact news release only count 40% toward your account profit, whereas 100% of any news loss is deducted."
        : account.firmName === "The5ers"
        ? "Holding an existing trade through news is allowed, but executing orders (including pending triggers) within ±2 minutes of high-impact news is prohibited even during evaluation; profits made in that window are excluded."
        : "A 5-minute high-impact news window restriction applies; orders triggered inside the restricted window can result in profit deduction or breach.",
    whatItMeansForYou: trader.tradesNews
      ? `Because your strategy actively trades around news events, ${account.firmName}'s ${
          account.firmName === "FundedNext"
            ? "asymmetric 40% profit / 100% loss rule on funded news executions within ±5 minutes degrades your strategy's mathematical expectancy after funding."
            : "restricted execution window (±2 to ±5 minutes) means pending straddles, market entries, or tight stops triggered inside the window will violate funded rules."
        }`
      : `Your strategy does not rely on news execution. However, remember that a resting Stop-Loss or Take-Profit triggered during a restricted ±2 to ±5 minute high-impact window can still count as an order execution on funded Standard accounts.`,
    howToManageIt: trader.tradesNews
      ? "Enter positions at least 6 minutes prior to the scheduled release with stops wide enough not to trigger inside the restricted window, or restrict news setups to evaluation stages where permitted."
      : "Check the economic calendar at the start of your session and cancel unfilled pending orders 10 minutes before Red-folder releases on your traded currency pairs.",
  };

  // 6. Consistency & Profit Concentration
  const consistencyRule: RuleBreakdownItem = {
    id: "consistency",
    title: `Consistency & Profit Concentration (${account.consistencyRule.value.toUpperCase()})`,
    status: account.consistencyRule.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.consistencyDetails.sourceUrl ?? account.consistencyRule.sourceUrl,
    verifiedAt: account.consistencyDetails.verifiedAt ?? account.consistencyRule.verifiedAt,
    riskLevel:
      account.consistencyRule.status !== "verified"
        ? "unverified"
        : account.consistencyRule.value === "present"
        ? "moderate"
        : "low",
    whatTheRuleSays:
      account.consistencyDetails.value ??
      account.consistencyRule.note ??
      "Consistency rule status depends on checkout payout selection or is not verified.",
    whatItMeansInPractice:
      account.consistencyRule.value === "absent"
        ? "There is no Best Day cap. You can pass an evaluation phase or qualify for a payout even if a single outlier trend day generates 70%+ of your target profit."
        : account.firmName === "FTMO"
        ? "FTMO 1-Step enforces a 50% Best Day rule: your single highest-profit day cannot exceed 50% of your total positive days' profit. Exceeding 50% does not forfeit the account, but it raises the required total profit target until your best day represents ≤50%."
        : "Under FundedNext Stellar 2-Step, consistency depends on the payout cycle selected at checkout: the On-Demand payout option enforces a strict 40% Best Day limit, whereas Standard 21-Day/14-Day cycles do not impose that same cap.",
    whatItMeansForYou:
      history && history.bestDayProfitShare !== null
        ? `In your imported trading history, your single best UTC day generated ${(history.bestDayProfitShare * 100).toFixed(1)}% of total net profit${
            history.topThreeTradesProfitShare !== null && history.topThreeTradesProfitShare !== undefined
              ? ` (and your top 3 trades produced ${(history.topThreeTradesProfitShare * 100).toFixed(0)}% of net profit)`
              : ""
          }.${
            account.consistencyRule.value === "present" && history.bestDayProfitShare > 0.5
              ? " Because your historical best day exceeded 50%, you would have had to continue trading past the nominal profit target on this account."
              : account.consistencyRule.value === "absent"
              ? " Choosing an account with no consistency rule protects your natural payoff distribution from artificial target inflation."
              : ""
          }`
        : trader.avoidsConsistencyRules
        ? "You explicitly requested to avoid consistency rules so outlier winning days are never penalized."
        : "Without uploaded daily P&L history, evaluate whether your strategy relies on occasional home-run days (>40%–50% of total cycle profit).",
    howToManageIt:
      account.consistencyRule.value === "present"
        ? "Cap single-day realized gains at 35%–40% of the phase profit target (e.g., +3.5% to +4.0% on a 10% target) so a single windfall session never inflates your required passing profit."
        : account.firmName === "FundedNext"
        ? "At FundedNext checkout, select the Standard payout option rather than On-Demand if your strategy produces concentrated windfall days exceeding 40% of cycle profit."
        : "No consistency cap applies on this programme—you can let high-R winners run to full target without capping daily upside.",
  };

  // 7. Automation, EAs & Execution Practices
  const automationRule: RuleBreakdownItem = {
    id: "automation-execution",
    title: `EAs, Automation & Execution Rules (${account.automationRule.value.toUpperCase()})`,
    status: account.automationRule.status === "verified" ? "verified" : "unverified",
    sourceUrl: account.automationRule.sourceUrl ?? account.otherRestrictions.sourceUrl,
    verifiedAt: account.automationRule.verifiedAt ?? account.otherRestrictions.verifiedAt,
    riskLevel:
      account.automationRule.status !== "verified"
        ? "unverified"
        : trader.usesAutomation && account.automationRule.value !== "allowed"
        ? "elevated"
        : (history?.shortHoldTradesCount ?? 0) > 0 && account.firmName === "FundedNext"
        ? "elevated"
        : "low",
    whatTheRuleSays: `${account.automationRule.note ?? `Automation status: ${account.automationRule.value}.`} ${account.otherRestrictions.value ?? ""}`.trim(),
    whatItMeansInPractice:
      account.firmName === "FundedNext"
        ? `Two critical operational rules apply: (1) Expert Advisors (EAs) are permitted on Stellar accounts below $50,000, but are PROHIBITED on $50,000, $100,000, and $200,000 accounts. (2) Under the 'Quick Strike' rule, trades closed within 30 seconds must stay below 30% during the Challenge, and tick scalping is prohibited.`
        : account.firmName === "FTMO"
        ? "Third-party or custom EAs are permitted provided you use unique parameters (not group copy-trading an identical public bot across FTMO's server pool) and stay within platform order/Modification daily execution limits."
        : "Execution must represent genuine market decision-making without latency arbitrage, tick scalping, or cross-account opposite hedging.",
    whatItMeansForYou: `${
      trader.usesAutomation
        ? `You use an EA or automated execution.`
        : `You trade manually without automated EA execution.`
    }${
      history && (history.shortHoldTradesCount ?? 0) > 0
        ? ` Note that your trade history includes ${history.shortHoldTradesCount} trade(s) held for 30 seconds or less.`
        : ""
    }`,
    howToManageIt: trader.usesAutomation
      ? "Ensure your EA uses unique magic numbers and customized stop/target parameters, avoids high-frequency order modifications (>1,000 server messages/day), and includes a news-filter pause if required by funded stage rules."
      : "If using trade-management utility scripts (lot calculators or partial-close keys), verify they do not trigger rapid sub-second order modifications.",
  };

  // 8. Payout Terms, Profit Split & Fee Conditions
  const payoutRule: RuleBreakdownItem = {
    id: "payouts-fees",
    title: `Payout Terms & Profit Split (${account.profitSplit.value ?? "Unverified"})`,
    status:
      account.payoutTerms.status === "verified" &&
      account.profitSplit.status === "verified" &&
      account.feeTerms.status === "verified"
        ? "verified"
        : "unverified",
    sourceUrl: account.payoutTerms.sourceUrl ?? account.feeTerms.sourceUrl,
    verifiedAt: account.payoutTerms.verifiedAt ?? account.feeTerms.verifiedAt,
    riskLevel: account.feeTerms.status === "verified" ? "low" : "unverified",
    whatTheRuleSays: `Profit split: ${account.profitSplit.value ?? "unverified"}. Payout terms: ${account.payoutTerms.value ?? "unverified"} Fee terms: ${account.feeTerms.value ?? account.feeTerms.note ?? "unverified"}`,
    whatItMeansInPractice:
      account.firmName === "FTMO" && account.programmeName.includes("1-Step")
        ? "You receive a 90% profit split and can request your first reward 14 calendar days after placing your first funded trade. However, unlike FTMO 2-Step, the 1-Step entry fee is non-refundable."
        : account.firmName === "FTMO"
        ? "Reward requests are eligible from 14 days after the first funded trade, and the full 2-Step challenge entry fee is refunded with your first funded reward withdrawal."
        : account.firmName === "FundedNext"
        ? "Your payout cycle and split (80% Standard 21/14-day, 60% 3-Day, or 90% On-Demand with 40% consistency rule) are locked in at checkout. The purchase fee is refundable with your first Performance Reward."
        : "Payouts occur on a 14-day or plan-specific schedule after passing all evaluation stages; review any size-specific payout caps or refund add-on requirements before checkout.",
    whatItMeansForYou: `At a $${account.accountSize.toLocaleString("en-US")} allocation, a +2% funded monthly return ($${(account.accountSize * 0.02).toLocaleString("en-US")} gross) yields an estimated net reward far exceeding the initial evaluation fee—provided you survive the evaluation without breaching daily or overall limits.`,
    howToManageIt: `When requesting a funded payout on a trailing-drawdown or daily-equity-reset account, never withdraw 100% of accumulated profits if doing so leaves your account balance dangerously close to the locked-in loss floor.`,
  };

  return [
    dailyRule,
    drawdownRule,
    phasesRule,
    holdingRule,
    newsRule,
    consistencyRule,
    automationRule,
    payoutRule,
  ];
}

function buildAlternativesAnalysis(
  primaryAccount: FirmAccount | null,
  assessments: AccountAssessment[],
  trader: TraderProfile
): AlternativeAccountComparison[] {
  const others = assessments.filter((a) => a.account.id !== primaryAccount?.id);

  // Pick a diverse set of strong alternatives: best from other firms or distinct programme structures
  const selected: AccountAssessment[] = [];
  const seenProgrammeTypes = new Set<string>();
  if (primaryAccount) {
    seenProgrammeTypes.add(`${primaryAccount.firmName}-${primaryAccount.programmeName.split("·")[0].trim()}`);
  }

  // First pass: eligible accounts from distinct firm/programme families
  for (const item of others) {
    const family = `${item.account.firmName}-${item.account.programmeName.split("·")[0].trim()}`;
    if (!seenProgrammeTypes.has(family) && selected.length < 4) {
      selected.push(item);
      seenProgrammeTypes.add(family);
    }
  }
  // Second pass: fill up to 4 with top remaining accounts
  for (const item of others) {
    if (selected.length >= 4) break;
    if (!selected.some((s) => s.account.id === item.account.id)) {
      selected.push(item);
    }
  }

  return selected.map((item) => {
    const acc = item.account;
    const priceText =
      acc.price.status === "verified" && acc.price.value !== null
        ? formatCurrency(acc.price.value, acc.priceCurrency)
        : "Unverified fee";

    const whatMakesItAttractive =
      acc.firmName === "FTMO" && acc.programmeName.includes("2-Step")
        ? `Static 10% overall drawdown, 5% daily loss allowance, no Best Day consistency rule, and a 100% refundable fee (${priceText}) upon first reward.`
        : acc.firmName === "FTMO" && acc.programmeName.includes("1-Step")
        ? `Single-phase evaluation (10% target) with no minimum trading days and a flat 90% profit split (${priceText}).`
        : acc.firmName === "FundedNext"
        ? `Static 10% overall floor, 5% daily loss limit, verified weekend holding permission, and competitive USD entry pricing (${priceText}).`
        : acc.firmName === "The5ers"
        ? `Static 10% maximum loss, 5% daily allowance, overnight/weekend holding allowed, and low entry cost on smaller tiers (${priceText}).`
        : `Static 8% maximum loss, no Best Day consistency rule, and discounted EUR entry pricing (${priceText}).`;

    const satisfiedRequirements =
      item.reasons.length > 0
        ? item.reasons
        : [
            acc.accountSize >= trader.minimumAccountSize
              ? `Meets minimum size ($${acc.accountSize.toLocaleString("en-US")})`
              : `Account size $${acc.accountSize.toLocaleString("en-US")}`,
          ];

    let whyItRanksLower = "";
    let disadvantageSeverity: AlternativeAccountComparison["disadvantageSeverity"] = "material_trade_off";
    let whenToReconsider = "";

    if (!item.eligible) {
      disadvantageSeverity = "deal_breaker";
      whyItRanksLower = `Fails hard eligibility check(s) for your profile: ${item.reasons.join(" ")}`;
      whenToReconsider = `Only reconsider if your real trading constraints change (${item.reasons[0]?.toLowerCase() ?? "budget or rule constraint"}).`;
    } else if (item.missingDecisionEvidence.length > 0) {
      disadvantageSeverity = "evidence_gap";
      whyItRanksLower = `Important profile-relevant evidence is unverified or currency-mismatched: ${item.missingDecisionEvidence.join(", ")}. We never treat an unknown rule as favourable.`;
      whenToReconsider =
        acc.priceCurrency !== trader.budgetCurrency
          ? `Switch your budget currency to ${acc.priceCurrency} if you are comfortable paying in ${acc.priceCurrency} and want to evaluate this programme's verified ${acc.priceCurrency} pricing.`
          : `Reconsider once you confirm ${item.missingDecisionEvidence.join(" and ")} directly on ${acc.firmName}'s current checkout terms.`;
    } else if (acc.drawdownType.value === "trailing") {
      disadvantageSeverity = "material_trade_off";
      whyItRanksLower = `Uses an End-of-Day trailing overall drawdown and a tighter 3% daily loss limit plus a 50% Best Day consistency requirement, creating narrower error margins than a static 5%-daily-loss 2-Step programme.`;
      whenToReconsider = `Reconsider if passing in a single 10% phase with zero minimum trading days outweighs having a 5% daily buffer and static drawdown floor.`;
    } else if (acc.overallLossLimitPct.value !== null && acc.overallLossLimitPct.value < 10) {
      disadvantageSeverity = "material_trade_off";
      whyItRanksLower = `Offers a tighter ${acc.overallLossLimitPct.value}% overall loss limit and ${acc.dailyLossLimitPct.value}% daily loss limit compared to the 10% overall / 5% daily standard on leading competitors.`;
      whenToReconsider = `Reconsider if upfront EUR fee savings are your primary constraint and your historical drawdown stays well under 4%.`;
    } else {
      disadvantageSeverity = "material_trade_off";
      whyItRanksLower = `Scores ${item.score ?? 0}% (${item.scoreCoveragePct}% verified coverage) vs. our primary recommendation due to ${
        primaryAccount && acc.accountSize !== primaryAccount.accountSize
          ? `capital-to-fee positioning ($${acc.accountSize.toLocaleString("en-US")} at ${priceText})`
          : `rule trade-offs around payout conditions and phase structure`
      }.`;
      whenToReconsider = `A strong runner-up if you want to diversify across multiple prop firms or prefer a $${acc.accountSize.toLocaleString("en-US")} allocation at ${priceText}.`;
    }

    return {
      account: acc,
      assessment: item,
      whatMakesItAttractive,
      satisfiedRequirements,
      whyItRanksLower,
      disadvantageSeverity,
      whenToReconsider,
    };
  });
}

export function generateAdvisoryReport(
  trader: TraderProfile,
  allAccounts: FirmAccount[],
  history: TradeHistorySummary | null
): AdvisoryReport {
  const assessments = allAccounts
    .map((account) => assessAccount(trader, account, history))
    .sort(
      (a, b) =>
        Number(b.decisionReady) - Number(a.decisionReady) ||
        Number(b.eligible) - Number(a.eligible) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        b.verifiedRuleCount - a.verifiedRuleCount ||
        b.account.accountSize - a.account.accountSize
    );

  const decision: AdvisorDecision = decidePrimaryRecommendation(assessments);
  const primaryAccount = decision.account;
  const primaryAssessment = primaryAccount
    ? assessments.find((a) => a.account.id === primaryAccount.id) ?? null
    : null;

  const verdict: AdvisoryReport["executiveRecommendation"]["verdict"] = decision.isPurchaseRecommendation
    ? "recommended"
    : primaryAccount
    ? "preliminary_candidate"
    : "no_suitable_account";

  const priceFormatted =
    primaryAccount && primaryAccount.price.status === "verified" && primaryAccount.price.value !== null
      ? formatCurrency(primaryAccount.price.value, primaryAccount.priceCurrency)
      : "Unverified fee";

  const basePriceFormatted =
    primaryAccount?.basePrice?.status === "verified" &&
    primaryAccount.basePrice.value !== null &&
    primaryAccount.basePrice.value !== primaryAccount.price.value
      ? formatCurrency(primaryAccount.basePrice.value, primaryAccount.priceCurrency)
      : null;

  const evidenceCoveragePct = primaryAssessment
    ? Math.round((primaryAssessment.verifiedRuleCount / primaryAssessment.relevantRuleCount) * 100)
    : 0;

  // Build 9-point executive thesis
  const ninePointThesis = primaryAccount && primaryAssessment
    ? {
        firmAndProgramme: `${primaryAccount.firmName} — ${primaryAccount.programmeName}`,
        sizeAndPrice: `$${primaryAccount.accountSize.toLocaleString("en-US")} simulated allocation for ${priceFormatted} one-time fee${
          basePriceFormatted ? ` (published offer; standard fee ${basePriceFormatted})` : ""
        }.`,
        strategyFit: `Your ${trader.tradingStyle} approach on ${trader.marketsTraded || "Forex/CFDs"}${
          trader.executionTimeframe ? ` (${trader.executionTimeframe})` : ""
        } at ~${trader.tradesPerWeek} trades/week aligns with ${primaryAccount.firmName}'s documented strategy permissions${
          trader.strategyDescription
            ? ` and your stated methodology ("${trader.strategyDescription.slice(0, 120)}${trader.strategyDescription.length > 120 ? "…" : ""}")`
            : ""
        }.`,
        drawdownFit: `Provides a ${primaryAccount.dailyLossLimitPct.value ?? "?"}% daily loss limit ($${
          primaryAccount.dailyLossLimitPct.value !== null
            ? ((primaryAccount.accountSize * primaryAccount.dailyLossLimitPct.value) / 100).toLocaleString("en-US")
            : "?"
        }) and a ${primaryAccount.overallLossLimitPct.value ?? "?"}% ${primaryAccount.drawdownType.value} overall loss limit ($${
          primaryAccount.overallLossLimitPct.value !== null
            ? ((primaryAccount.accountSize * primaryAccount.overallLossLimitPct.value) / 100).toLocaleString("en-US")
            : "?"
        }). ${
          primaryAccount.drawdownType.value === "static"
            ? "Because the overall floor is static at 90%/92% of starting balance, banked profits expand your usable buffer rather than trailing your floor upward."
            : "Note that the overall limit trails your highest End-of-Day balance, requiring disciplined sizing after new equity highs."
        }`,
        operationalRestrictionsInteraction: `Holding rule: ${
          primaryAccount.weekendHolding.value === "allowed"
            ? primaryAccount.firmName === "FTMO"
              ? "Weekend holding is allowed during evaluation, though Standard funded accounts restrict holding across market breaks >2h."
              : "Overnight and weekend holding are permitted (swap charges count toward daily loss)."
            : "Weekend holding status is unverified or restricted."
        } News rule: ${
          primaryAccount.newsExecution.value === "restricted"
            ? "Unrestricted in evaluation (FTMO/FundedNext) or ±2 min restricted (The5ers), with specific funded-stage high-impact window rules."
            : primaryAccount.newsExecution.value
        }`,
        historyStrengthsAndVulnerabilities: history
          ? `Across ${history.tradeCount} analyzed trades (win rate ${
              history.winRate !== null && history.winRate !== undefined ? `${(history.winRate * 100).toFixed(1)}%` : "N/A"
            }, profit factor ${history.profitFactor !== null ? history.profitFactor.toFixed(2) : "N/A"}, average hold ${Math.round(
              history.averageHoldingMinutes
            )} min), your longest losing streak was ${history.maxLosingStreak} trade(s)${
              history.largestRealizedDailyLossPct !== null
                ? ` and peak realized daily loss was ${history.largestRealizedDailyLossPct.toFixed(2)}%`
                : ""
            }.${
              history.bestDayProfitShare !== null
                ? ` Your best single day generated ${(history.bestDayProfitShare * 100).toFixed(1)}% of net profit.`
                : ""
            }`
          : "No closed-trade CSV or manual trade history has been linked yet. The recommendation is currently based on your declared strategy parameters; uploading your demo trade history will unlock empirical streak, session, and profit-concentration stress tests.",
        evaluationAndPayoutFit: `${primaryAccount.evaluationPhases.value ?? "?"}-phase evaluation targeting ${
          primaryAccount.profitTargetsPct.value?.map((t) => `${t}%`).join(" / ") ?? "unverified"
        } with ${primaryAccount.minimumTradingDays.value ?? "documented minimum days"} and ${
          primaryAccount.timeLimit.value ?? "unlimited"
        } duration. Funded profit split is ${primaryAccount.profitSplit.value ?? "unverified"}.`,
        knownDisadvantages:
          primaryAccount.firmName === "FTMO" && primaryAccount.programmeName.includes("1-Step")
            ? "Tighter 3% daily loss limit, EOD trailing 10% maximum loss, 50% Best Day consistency requirement, non-refundable entry fee, and funded Standard market-break holding limits."
            : primaryAccount.firmName === "FTMO" && primaryAccount.programmeName.includes("2-Step")
            ? "Requires passing two sequential phases (10% then 5%) with 4 minimum trading days per phase, and funded Standard accounts restrict news execution (±2 min) and market breaks >2 hours."
            : primaryAccount.firmName === "FundedNext"
            ? "Checkout payout option dictates consistency rules (On-Demand enforces a 40% Best Day rule), funded news trades within ±5 min only credit 40% of profits while deducting 100% of losses, sub-30s Quick Strike trades are capped below 30%, and EAs are prohibited at $50K+."
            : primaryAccount.firmName === "BrightFunded"
            ? "Tighter 4% daily and 8% overall loss limits, daily loss resets from the higher of balance or equity, and weekend/EA specifics require agreement verification."
            : "Daily loss resets from the higher of prior balance or equity, requires 3 profitable days per phase, enforces a 30-day inactivity rule, and restricts ±2 min high-impact news execution.",
        confidenceAndEvidence: `${
          decision.isPurchaseRecommendation
            ? `High Decision Readiness: 100% of profile-critical decision criteria and ${primaryAssessment.verifiedRuleCount}/${primaryAssessment.relevantRuleCount} total programme fields are verified against official sources (checked 2026-10-29).`
            : `Preliminary Candidate Only: While ${primaryAssessment.verifiedRuleCount}/${primaryAssessment.relevantRuleCount} total fields are verified, critical decision evidence is missing or mismatched (${primaryAssessment.missingDecisionEvidence.join(", ")}). Do not purchase until those items are resolved.`
        }`,
      }
    : {
        firmAndProgramme: "No Suitable Account Identified",
        sizeAndPrice: "N/A",
        strategyFit: "None of the 27 researched account records satisfied all of your hard eligibility constraints.",
        drawdownFit: "Review your preferred drawdown model and minimum account size against your budget currency.",
        operationalRestrictionsInteraction: "Check excluded programmes below to see which specific constraint caused rejection.",
        historyStrengthsAndVulnerabilities: history
          ? `Your sample of ${history.tradeCount} trades is loaded and ready once profile constraints are adjusted.`
          : "No trade history linked.",
        evaluationAndPayoutFit: "N/A",
        knownDisadvantages: "N/A",
        confidenceAndEvidence: "All eligibility rejections are based on verified official firm rules.",
      };

  const headline =
    verdict === "recommended" && primaryAccount
      ? `Recommended Account: ${primaryAccount.firmName} — ${primaryAccount.programmeName} (${priceFormatted})`
      : verdict === "preliminary_candidate" && primaryAccount
      ? `Preliminary Candidate (Evidence Gaps Remain): ${primaryAccount.firmName} — ${primaryAccount.programmeName}`
      : "No Researched Programme Currently Clears Your Hard Strategy Constraints";

  const executiveNarrative =
    verdict === "recommended" && primaryAccount && primaryAssessment
      ? `Based on your ${trader.tradingStyle} profile${
          history ? ` and empirical analysis of your ${history.tradeCount} closed trades` : ""
        }, I recommend ${primaryAccount.firmName}'s ${primaryAccount.programmeName} at ${priceFormatted}. ${
          !trader.requiresWeekendHolding && (history?.weekendTradesCount ?? 0) === 0
            ? "Because your trades close prior to weekend market breaks, multi-day weekend holding permissions are not a decisive edge for you. "
            : "Because your strategy requires holding positions across sessions, this account's documented holding rules are directly aligned with your exposure. "
        }More importantly, its ${primaryAccount.dailyLossLimitPct.value}% daily loss allowance and ${primaryAccount.overallLossLimitPct.value}% ${
          primaryAccount.drawdownType.value
        } overall drawdown calculation provide the strongest verified structural fit for your risk parameters within your ${formatCurrency(
          trader.maxBudget,
          trader.budgetCurrency
        )} budget.`
      : decision.message;

  const ruleBreakdowns = primaryAccount ? buildRuleBreakdowns(primaryAccount, trader, history) : [];

  // Risk & Scenario Analysis
  const dailyLimitPct = primaryAccount?.dailyLossLimitPct.value ?? null;
  const dailyLimitAmount =
    primaryAccount && dailyLimitPct !== null ? (primaryAccount.accountSize * dailyLimitPct) / 100 : null;
  const riskPct = trader.riskPerTradePct;
  const consecutiveLossesToBreachDaily =
    dailyLimitPct !== null && riskPct !== null && riskPct > 0 ? Math.floor(dailyLimitPct / riskPct) : null;
  const observedMaxLosingStreak = history?.maxLosingStreak ?? trader.expectedMaxLosingStreak ?? null;
  const streakCompoundedLossPct =
    observedMaxLosingStreak !== null && riskPct !== null
      ? estimateSequentialLossExposure(riskPct, observedMaxLosingStreak)
      : null;
  const observedLargestDailyLossPct = history?.largestRealizedDailyLossPct ?? null;

  let dailyStatus: AdvisoryReport["riskAndScenarioAnalysis"]["dailyLossBuffer"]["status"] = "insufficient_data";
  if (dailyLimitPct !== null) {
    if (
      (observedLargestDailyLossPct !== null && observedLargestDailyLossPct >= dailyLimitPct * 0.85) ||
      (streakCompoundedLossPct !== null && streakCompoundedLossPct >= dailyLimitPct) ||
      (consecutiveLossesToBreachDaily !== null && consecutiveLossesToBreachDaily <= 2)
    ) {
      dailyStatus = "breach_risk";
    } else if (
      (observedLargestDailyLossPct !== null && observedLargestDailyLossPct >= dailyLimitPct * 0.6) ||
      (streakCompoundedLossPct !== null && streakCompoundedLossPct >= dailyLimitPct * 0.7) ||
      (consecutiveLossesToBreachDaily !== null && consecutiveLossesToBreachDaily <= 4)
    ) {
      dailyStatus = "tight";
    } else if (riskPct !== null || observedLargestDailyLossPct !== null) {
      dailyStatus = "comfortable";
    }
  }

  const dailyExplanation =
    dailyLimitPct !== null && riskPct !== null
      ? `At ${riskPct}% risk per trade on a ${dailyLimitPct}% daily limit ($${dailyLimitAmount?.toLocaleString("en-US")}), ${consecutiveLossesToBreachDaily} full stop-outs in a single day reach ${((consecutiveLossesToBreachDaily ?? 0) * riskPct).toFixed(2)}% linear loss.${
          streakCompoundedLossPct !== null && observedMaxLosingStreak !== null
            ? ` If your ${observedMaxLosingStreak}-trade losing streak occurred in one day, compounded balance loss would be ${streakCompoundedLossPct.toFixed(2)}% (${
                streakCompoundedLossPct >= dailyLimitPct
                  ? `BREACHING the ${dailyLimitPct}% daily limit`
                  : `leaving ${(dailyLimitPct - streakCompoundedLossPct).toFixed(2)}% buffer before commissions and floating drawdown`
              }).`
            : ""
        }`
      : dailyLimitPct !== null
      ? `The account allows a ${dailyLimitPct}% ($${dailyLimitAmount?.toLocaleString("en-US")}) daily loss. Enter your risk % per trade in the profile to calculate exact consecutive-loss survival.`
      : "Daily loss limit is not verified for this candidate.";

  const recommendedDailyStopProtocol =
    dailyLimitPct !== null && riskPct !== null && riskPct > 0
      ? `Hard Daily Circuit Breaker: Stop opening new trades for the UTC/CE(S)T session after ${Math.max(
          1,
          Math.min(3, Math.floor((dailyLimitPct * 0.65) / riskPct))
        )} losing trade(s) or -${(dailyLimitPct * 0.6).toFixed(2)}% realized + floating loss.`
      : `Hard Daily Circuit Breaker: Cap daily loss at 60% of the firm's daily limit to preserve a 40% buffer for floating excursion, swaps, and slippage.`;

  const overallLimitPct = primaryAccount?.overallLossLimitPct.value ?? null;
  const overallLimitAmount =
    primaryAccount && overallLimitPct !== null ? (primaryAccount.accountSize * overallLimitPct) / 100 : null;

  const wouldTriggerConsistencyDelay = Boolean(
    primaryAccount &&
      history?.bestDayProfitShare !== null &&
      history?.bestDayProfitShare !== undefined &&
      ((primaryAccount.consistencyRule.value === "present" && history.bestDayProfitShare > 0.5) ||
        (primaryAccount.firmName === "FundedNext" && history.bestDayProfitShare > 0.4))
  );

  // Purchase readiness verdict
  let readyToPurchaseNow: AdvisoryReport["riskAndScenarioAnalysis"]["purchaseReadinessVerdict"]["readyToPurchaseNow"] =
    "yes_with_discipline";
  const readinessRationale: string[] = [];

  if (!primaryAccount || !decision.isPurchaseRecommendation) {
    readyToPurchaseNow = "no_unproven_or_incompatible";
    readinessRationale.push(
      primaryAccount
        ? `Critical rule or pricing evidence remains unresolved for ${primaryAccount.firmName} (${primaryAssessment?.missingDecisionEvidence.join(", ")}).`
        : "No researched account currently meets your declared strategy and budget constraints."
    );
  }
  if (history && (history.netProfit ?? 0) <= 0 && history.expectancy <= 0) {
    readyToPurchaseNow = "no_unproven_or_incompatible";
    readinessRationale.push(
      `Your imported demo sample (${history.tradeCount} trades) has negative expectancy (${history.expectancy.toFixed(2)} per trade). Paying an evaluation fee before proving positive expectancy on demo is financially inadvisable.`
    );
  } else if (history && history.tradeCount < 15) {
    if (readyToPurchaseNow === "yes_with_discipline") readyToPurchaseNow = "caution_refine_first";
    readinessRationale.push(
      `Your uploaded sample contains ${history.tradeCount} trades. While profitable, a sample under 20–30 trades has wide statistical variance and may understate your true maximum losing streak.`
    );
  }
  if (dailyStatus === "breach_risk") {
    if (readyToPurchaseNow === "yes_with_discipline") readyToPurchaseNow = "caution_refine_first";
    readinessRationale.push(
      "Your current risk per trade or historical daily loss peak leaves minimal room under the programme's daily loss limit. Reduce per-trade risk before starting an evaluation."
    );
  }
  if (readinessRationale.length === 0) {
    readinessRationale.push(
      "All profile-relevant programme rules and entry fees are verified against official documentation.",
      history
        ? `Your ${history.tradeCount}-trade historical sample demonstrates positive expectancy with drawdown inside the programme's verified limits.`
        : "Your stated risk parameters fit comfortably inside the programme's daily and maximum loss thresholds."
    );
  }

  const purchaseHeadline =
    readyToPurchaseNow === "yes_with_discipline"
      ? "Purchasing This Evaluation Makes Sense — Subject to Strict Daily Stop Discipline"
      : readyToPurchaseNow === "caution_refine_first"
      ? "Proceed with Caution — Adjust Position Sizing or Expand Demo Sample Before Paying"
      : "Do Not Purchase an Evaluation Right Now — Resolve Evidence Gaps or Demo Expectancy First";

  // Financial Trade-Off Analysis & Cost Comparison Rows
  const maxDrawdownRoomAmount = overallLimitAmount;
  const costPerThousandDrawdownRoom =
    primaryAccount?.price.value && maxDrawdownRoomAmount && maxDrawdownRoomAmount > 0
      ? (primaryAccount.price.value / maxDrawdownRoomAmount) * 1000
      : null;

  const candidatePool = assessments
    .filter((a) => a.account.price.status === "verified" && a.account.price.value !== null)
    .slice(0, 6);

  const comparisonRows: CostComparisonRow[] = candidatePool.map((item) => {
    const acc = item.account;
    const ddDollar =
      acc.overallLossLimitPct.value !== null ? (acc.accountSize * acc.overallLossLimitPct.value) / 100 : null;
    const costPer1k =
      acc.price.value !== null && ddDollar && ddDollar > 0 ? (acc.price.value / ddDollar) * 1000 : null;
    return {
      accountId: acc.id,
      firmName: acc.firmName,
      programmeName: acc.programmeName,
      accountSize: acc.accountSize,
      priceCurrency: acc.priceCurrency,
      entryPrice: acc.price.value,
      basePrice: acc.basePrice?.value ?? null,
      maxDrawdownDollar: ddDollar,
      costPer1kDrawdown: costPer1k,
      profitSplit: acc.profitSplit.value ?? "Unverified",
      refundSummary:
        acc.firmName === "FTMO" && acc.programmeName.includes("1-Step")
          ? "Non-refundable fee"
          : acc.firmName === "FTMO"
          ? "100% refunded w/ 1st reward"
          : acc.firmName === "FundedNext"
          ? "Refundable w/ 1st reward"
          : acc.firmName === "BrightFunded"
          ? "Refund requires paid add-on"
          : "Unverified refund terms",
      isRecommended: acc.id === primaryAccount?.id,
      tradeOffNote:
        acc.id === primaryAccount?.id
          ? "Primary Recommendation · Strongest rule & evidence alignment"
          : !item.eligible
          ? `Excluded: ${item.reasons[0] ?? "Profile conflict"}`
          : item.missingDecisionEvidence.length > 0
          ? `Missing: ${item.missingDecisionEvidence[0]}`
          : `${acc.drawdownType.value} DD · ${acc.dailyLossLimitPct.value}% daily limit`,
    };
  });

  // Evidence Audit Log
  const entries: EvidenceAuditEntry[] = primaryAccount
    ? [
        {
          ruleLabel: "Account Size & Allocation",
          valueSummary: `$${primaryAccount.accountSize.toLocaleString("en-US")}`,
          status: primaryAccount.accountSizeEvidence.status,
          sourceUrl: primaryAccount.accountSizeEvidence.sourceUrl,
          verifiedAt: primaryAccount.accountSizeEvidence.verifiedAt,
        },
        {
          ruleLabel: "Entry Fee & Promotional Terms",
          valueSummary: priceFormatted,
          status: primaryAccount.price.status,
          sourceUrl: primaryAccount.price.sourceUrl,
          verifiedAt: primaryAccount.price.verifiedAt,
          operationalNote: primaryAccount.price.note,
        },
        {
          ruleLabel: "Evaluation Phases & Targets",
          valueSummary: `${primaryAccount.evaluationPhases.value ?? "?"} phase(s) · ${(primaryAccount.profitTargetsPct.value ?? []).join("% / ")}%`,
          status:
            primaryAccount.evaluationPhases.status === "verified" && primaryAccount.profitTargetsPct.status === "verified"
              ? "verified"
              : "unverified",
          sourceUrl: primaryAccount.profitTargetsPct.sourceUrl,
          verifiedAt: primaryAccount.profitTargetsPct.verifiedAt,
        },
        {
          ruleLabel: "Daily & Overall Loss Calculation",
          valueSummary: `${primaryAccount.dailyLossLimitPct.value ?? "?"}% daily / ${primaryAccount.overallLossLimitPct.value ?? "?"}% overall (${primaryAccount.drawdownType.value})`,
          status: primaryAccount.lossCalculation.status,
          sourceUrl: primaryAccount.lossCalculation.sourceUrl,
          verifiedAt: primaryAccount.lossCalculation.verifiedAt,
          operationalNote: primaryAccount.lossCalculation.value ?? undefined,
        },
        {
          ruleLabel: "Daily Reset Schedule",
          valueSummary: primaryAccount.dailyReset.value ?? "Unverified",
          status: primaryAccount.dailyReset.status,
          sourceUrl: primaryAccount.dailyReset.sourceUrl,
          verifiedAt: primaryAccount.dailyReset.verifiedAt,
        },
        {
          ruleLabel: "Minimum Trading Days & Time Limit",
          valueSummary: `${primaryAccount.minimumTradingDays.value ?? "Unverified"} · ${primaryAccount.timeLimit.value ?? "Unverified"}`,
          status: primaryAccount.minimumTradingDays.status,
          sourceUrl: primaryAccount.minimumTradingDays.sourceUrl,
          verifiedAt: primaryAccount.minimumTradingDays.verifiedAt,
          operationalNote: primaryAccount.minimumTradingDays.note,
        },
        {
          ruleLabel: "Overnight & Weekend Holding",
          valueSummary: primaryAccount.weekendHolding.value.toUpperCase(),
          status: primaryAccount.weekendRule.status,
          sourceUrl: primaryAccount.weekendRule.sourceUrl,
          verifiedAt: primaryAccount.weekendRule.verifiedAt,
          operationalNote: primaryAccount.weekendRule.value ?? primaryAccount.weekendRule.note,
        },
        {
          ruleLabel: "News Execution Policy",
          valueSummary: primaryAccount.newsExecution.value.toUpperCase(),
          status: primaryAccount.newsRule.status,
          sourceUrl: primaryAccount.newsRule.sourceUrl,
          verifiedAt: primaryAccount.newsRule.verifiedAt,
          operationalNote: primaryAccount.newsRule.value ?? undefined,
        },
        {
          ruleLabel: "Consistency & Best Day Rule",
          valueSummary: primaryAccount.consistencyRule.value.toUpperCase(),
          status: primaryAccount.consistencyRule.status,
          sourceUrl: primaryAccount.consistencyDetails.sourceUrl,
          verifiedAt: primaryAccount.consistencyDetails.verifiedAt,
          operationalNote: primaryAccount.consistencyDetails.value ?? primaryAccount.consistencyRule.note,
        },
        {
          ruleLabel: "EA, Automation & Execution Limits",
          valueSummary: primaryAccount.automationRule.value.toUpperCase(),
          status: primaryAccount.automationRule.status,
          sourceUrl: primaryAccount.automationRule.sourceUrl,
          verifiedAt: primaryAccount.automationRule.verifiedAt,
          operationalNote: primaryAccount.automationRule.note ?? primaryAccount.otherRestrictions.value ?? undefined,
        },
        {
          ruleLabel: "Payout Eligibility, Split & Fee Refund",
          valueSummary: `Split: ${primaryAccount.profitSplit.value ?? "Unverified"}`,
          status:
            primaryAccount.payoutTerms.status === "verified" && primaryAccount.feeTerms.status === "verified"
              ? "verified"
              : "unverified",
          sourceUrl: primaryAccount.payoutTerms.sourceUrl,
          verifiedAt: primaryAccount.payoutTerms.verifiedAt,
          operationalNote: `${primaryAccount.payoutTerms.value ?? ""} ${primaryAccount.feeTerms.value ?? primaryAccount.feeTerms.note ?? ""}`.trim(),
        },
      ]
    : [];

  const unresolvedConflictsAndGaps: string[] = [];
  if (primaryAssessment && primaryAssessment.missingDecisionEvidence.length > 0) {
    for (const gap of primaryAssessment.missingDecisionEvidence) {
      unresolvedConflictsAndGaps.push(`Unverified or currency-mismatched for this profile: ${gap}.`);
    }
  }
  if (primaryAccount?.firmName === "FundedNext") {
    unresolvedConflictsAndGaps.push(
      "FundedNext Stellar 2-Step consistency rules depend on checkout payout selection (On-Demand applies a 40% Best Day cap; Quick Strike caps <30s trades below 30%).",
      "FundedNext $200,000 tier has conflicting official pricing articles ($999.99 plan page vs $1,099.99 reset/pricing article) and is kept unverified in the catalogue."
    );
  }
  if (primaryAccount?.firmName === "FTMO") {
    unresolvedConflictsAndGaps.push(
      "Phase vs. Funded distinction: FTMO allows unrestricted news trading and weekend holding during Challenge evaluation, but Standard funded accounts restrict selected news windows (±2 min) and market breaks >2 hours."
    );
  }
  if (primaryAccount?.firmName === "The5ers") {
    unresolvedConflictsAndGaps.push(
      "The5ers High Stakes larger tier fees ($5K–$100K), specific EA policy, and $2.5K payout caps were not confirmed in the inspected official documentation."
    );
  }
  if (primaryAccount?.firmName === "BrightFunded") {
    unresolvedConflictsAndGaps.push(
      "BrightFunded 2-Step Bright exact EA terms and weekend holding specifics were not confirmed in the inspected comparison sources."
    );
  }

  return {
    generatedAtIso: new Date().toISOString(),
    executiveRecommendation: {
      verdict,
      headline,
      executiveNarrative,
      primaryAccount,
      primaryAssessment,
      suitabilityScore: primaryAssessment?.score ?? null,
      evidenceCoveragePct,
      ninePointThesis,
    },
    ruleBreakdowns,
    riskAndScenarioAnalysis: {
      dailyLossBuffer: {
        accountDailyLimitPct: dailyLimitPct,
        accountDailyLimitAmount: dailyLimitAmount,
        traderRiskPerTradePct: riskPct,
        consecutiveLossesToBreachDaily,
        observedMaxLosingStreak,
        streakCompoundedLossPct,
        observedLargestDailyLossPct,
        status: dailyStatus,
        explanation: dailyExplanation,
        recommendedDailyStopProtocol,
      },
      overallDrawdownBuffer: {
        accountOverallLimitPct: overallLimitPct,
        accountOverallLimitAmount: overallLimitAmount,
        drawdownType: primaryAccount?.drawdownType.value ?? "unknown",
        observedMaxBalanceDrawdownPct: history?.maximumBalanceDrawdownPct ?? null,
        observedSampledEquityDrawdownPct: history?.maximumSampledEquityDrawdownPct ?? null,
        explanation:
          overallLimitPct !== null && primaryAccount
            ? `Your true risk allowance is ${overallLimitPct}% ($${overallLimitAmount?.toLocaleString("en-US")}) under a ${primaryAccount.drawdownType.value} calculation.${
                history?.maximumBalanceDrawdownPct !== null && history?.maximumBalanceDrawdownPct !== undefined
                  ? ` Your historical closed-trade balance drawdown was ${history.maximumBalanceDrawdownPct.toFixed(2)}%, leaving ${(overallLimitPct - history.maximumBalanceDrawdownPct).toFixed(2)}% of structural headroom (excluding unobserved intratrade floating dips).`
                  : ""
              }`
            : "Maximum drawdown buffer cannot be established without a verified account limit.",
      },
      consistencyCheck: {
        accountConsistencyRule:
          primaryAccount?.consistencyDetails.value ??
          primaryAccount?.consistencyRule.note ??
          "Unverified",
        observedBestDaySharePct:
          history?.bestDayProfitShare !== null && history?.bestDayProfitShare !== undefined
            ? history.bestDayProfitShare * 100
            : null,
        observedTopThreeTradesSharePct:
          history?.topThreeTradesProfitShare !== null && history?.topThreeTradesProfitShare !== undefined
            ? history.topThreeTradesProfitShare * 100
            : null,
        wouldTriggerDelay: wouldTriggerConsistencyDelay,
        explanation:
          history?.bestDayProfitShare !== null && history?.bestDayProfitShare !== undefined
            ? `Your best UTC trading day accounted for ${(history.bestDayProfitShare * 100).toFixed(1)}% of total net profit.${
                wouldTriggerConsistencyDelay
                  ? " This exceeds the programme's best-day consistency threshold and would require generating additional distributed profit before passing or withdrawing."
                  : " This satisfies the programme's documented consistency rules."
              }`
            : "Upload a closed-trade CSV to verify whether your daily profit concentration triggers best-day caps.",
      },
      holdingAndExecutionCheck: {
        observedAvgHoldMinutes: history ? Math.round(history.averageHoldingMinutes) : null,
        observedOvernightTrades: history?.overnightTradesCount ?? null,
        observedWeekendTrades: history?.weekendTradesCount ?? null,
        observedSub30sTrades: history?.shortHoldTradesCount ?? null,
        explanation: history
          ? `Observed across ${history.tradeCount} trades: average hold ${Math.round(history.averageHoldingMinutes)} min, ${
              history.overnightTradesCount ?? 0
            } overnight trade(s), ${history.weekendTradesCount ?? 0} weekend trade(s), and ${
              history.shortHoldTradesCount ?? 0
            } sub-30-second execution(s).`
          : "No historical trade timestamps loaded; holding analysis relies on your stated profile settings.",
      },
      purchaseReadinessVerdict: {
        readyToPurchaseNow,
        headline: purchaseHeadline,
        rationale: readinessRationale,
      },
    },
    alternativesAnalysis: buildAlternativesAnalysis(primaryAccount, assessments, trader),
    financialTradeOffAnalysis: {
      entryPriceFormatted: priceFormatted,
      basePriceFormatted,
      isPromotionalPrice: Boolean(basePriceFormatted),
      simulatedCapitalFormatted: primaryAccount
        ? `$${primaryAccount.accountSize.toLocaleString("en-US")}`
        : "N/A",
      maxDrawdownRoomAmount,
      costPerThousandDrawdownRoom,
      refundPolicy:
        primaryAccount?.feeTerms.value ??
        primaryAccount?.feeTerms.note ??
        "Refund policy is not verified for this account.",
      recurringAndActivationFees:
        primaryAccount?.firmName === "FTMO" || primaryAccount?.firmName === "BrightFunded"
          ? "One-time evaluation fee; official documentation states no mandatory recurring monthly charges. Optional checkout add-ons (where offered) cost extra."
          : primaryAccount?.firmName === "FundedNext"
          ? "One-time evaluation fee (refundable with first Performance Reward); optional add-ons such as No Minimum Trading Days or Swap-Free cost extra at checkout."
          : "Check checkout terms for any platform or regional payment processing fees.",
      profitSplitAndPayouts: primaryAccount
        ? `${primaryAccount.profitSplit.value ?? "Unverified split"} · ${primaryAccount.payoutTerms.value ?? "See official payout schedule."}`
        : "N/A",
      financialDownsideIfBreached: primaryAccount
        ? `If the account breaches the ${primaryAccount.dailyLossLimitPct.value ?? "?"}% daily or ${primaryAccount.overallLossLimitPct.value ?? "?"}% overall limit during evaluation, 100% of the ${priceFormatted} entry fee is lost and no refund is paid. Do not treat an evaluation fee as an investment with a predictable return.`
        : "100% of any evaluation entry fee is at risk if a loss rule is breached.",
      cheapestVsBestFitVerdict:
        primaryAccount && costPerThousandDrawdownRoom !== null
          ? `You are paying ${priceFormatted} to access $${maxDrawdownRoomAmount?.toLocaleString("en-US")} of actual drawdown room (${formatCurrency(
              costPerThousandDrawdownRoom,
              primaryAccount.priceCurrency
            )} per $1,000 of usable drawdown). While smaller or promotional accounts may have a lower sticker price, ${primaryAccount.firmName} ${primaryAccount.programmeName} offers the strongest verified rule alignment so you do not forfeit a cheaper fee to a hidden rule mismatch.`
          : "Always evaluate cost per $1,000 of usable drawdown room and rule compatibility rather than sticker price alone.",
      comparisonRows,
    },
    evidenceAuditLog: {
      researchSnapshotDate: "2026-10-29",
      verifiedCount: primaryAssessment?.verifiedRuleCount ?? 0,
      totalRulesChecked: primaryAssessment?.relevantRuleCount ?? 21,
      unresolvedConflictsAndGaps,
      entries,
    },
    finalDecisionSummary: {
      recommendationHeadline: headline,
      keyReasonsToChoose:
        primaryAssessment && primaryAssessment.reasons.length > 0
          ? [
              ...primaryAssessment.reasons,
              `Verified across ${primaryAssessment.verifiedRuleCount}/${primaryAssessment.relevantRuleCount} official rule checkpoints (snapshot 2026-10-29).`,
            ]
          : ["Review profile constraints and verified rule coverage before selecting an evaluation."],
      criticalRisksToRespect: [
        recommendedDailyStopProtocol,
        primaryAccount?.firmName === "FTMO"
          ? "Remember that FTMO Standard funded accounts enforce a 2-hour market-break closure rule and ±2-minute selected news execution restrictions that do not apply during the evaluation."
          : primaryAccount?.firmName === "FundedNext"
          ? "Remember that FundedNext funded accounts credit only 40% of profits (and 100% of losses) on ±5-minute high-impact news executions, and Quick Strike caps <30s trades below 30%."
          : "Daily loss calculations include open floating losses, commissions, and overnight swaps—never size positions assuming only closed losses count.",
        "An evaluation fee is a non-guaranteed testing cost; only spend capital you can afford to lose completely without affecting your living expenses.",
      ],
      prePurchaseChecklist: [
        `Confirm live checkout price (${priceFormatted}) and currency (${primaryAccount?.priceCurrency ?? trader.budgetCurrency}) on ${primaryAccount?.firmName ?? "the firm"}'s official checkout page.`,
        `Set your trading platform's daily risk alarm at ${
          dailyLimitPct !== null ? `${(dailyLimitPct * 0.6).toFixed(1)}%` : "60% of the daily limit"
        } before placing your first evaluation trade.`,
        "Verify your traded symbols, leverage, and trading platform availability (MT4/MT5/cTrader/DXtrade) for your country of residence prior to payment.",
      ],
    },
  };
}
