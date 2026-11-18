import type { TraderProfile, TradingStyle } from "../matching/types";
import type { TradeHistorySummary } from "../trading-history/types";

export type ExtractedStrategyDetails = {
  methodology: string[];
  instruments: string[];
  timeframes: string[];
  sessions: string[];
  entryAndStopLogic: string[];
  rewardRisk: number | null;
  riskPerTradePct: number | null;
  tradesPerWeekEstimate: number | null;
  holdingBehavior: string | null;
  inferredStyle: TradingStyle | null;
  inferredWeekendHolding: boolean | null;
  inferredOvernightHolding: boolean | null;
  inferredTradesNews: boolean | null;
  inferredUsesAutomation: boolean | null;
  subThirtySecondScalpRisk: boolean;
  hedgingOrMartingaleMentioned: boolean;
  copyTradingMentioned: boolean;
};

export type ConsultationFollowUp = {
  id: string;
  type: "contradiction" | "missing_detail" | "history_discrepancy" | "operational_alert";
  question: string;
  context: string;
  options: Array<{
    label: string;
    patch: Partial<TraderProfile>;
  }>;
};

export type ConsultationAssessment = {
  extracted: ExtractedStrategyDetails;
  followUps: ConsultationFollowUp[];
  completenessPct: number;
  suggestedPatch: Partial<TraderProfile>;
};

export function extractStrategyIntelligence(narrative: string): ExtractedStrategyDetails {
  const text = narrative.trim();
  const lower = text.toLowerCase();

  const methodology: string[] = [];
  if (/\b(ict|smc|smart money|order\s*block|fvg|fair value gap|liquidity sweep|inducement)\b/i.test(text)) {
    methodology.push("Smart Money Concepts / Liquidity Structure");
  }
  if (/\b(price action|support and resistance|s\/r|supply and demand|pin\s*bar|engulfing|market structure)\b/i.test(text)) {
    methodology.push("Price Action & Market Structure");
  }
  if (/\b(breakout|orb|opening range|range break|momentum|volatility expansion)\b/i.test(text)) {
    methodology.push("Breakout & Volatility Expansion");
  }
  if (/\b(mean reversion|pullback|vwap|bollinger|rsi|oversold|overbought|fade)\b/i.test(text)) {
    methodology.push("Pullback / Mean Reversion");
  }
  if (/\b(trend follow|moving average|ema|sma|higher high|channel)\b/i.test(text)) {
    methodology.push("Trend Following");
  }
  if (/\b(fundamental|macro|interest rate|central bank|cpi|nfp|fomc|news release)\b/i.test(text)) {
    methodology.push("Macro / Event-Driven");
  }

  const instruments: string[] = [];
  const symbolMatchers: Array<[RegExp, string]> = [
    [/\beur\/?usd\b/i, "EUR/USD"],
    [/\bgbp\/?usd\b/i, "GBP/USD"],
    [/\busd\/?jpy\b/i, "USD/JPY"],
    [/\baud\/?usd\b/i, "AUD/USD"],
    [/\busd\/?cad\b/i, "USD/CAD"],
    [/\bgbp\/?jpy\b/i, "GBP/JPY"],
    [/\b(xau\/?usd|gold)\b/i, "XAU/USD (Gold)"],
    [/\b(xag\/?usd|silver)\b/i, "XAG/USD (Silver)"],
    [/\b(nas100|us100|nasdaq|nq)\b/i, "NAS100"],
    [/\b(us30|dow|dj30)\b/i, "US30"],
    [/\b(spx500|us500|s&p\s*500|es)\b/i, "US500"],
    [/\b(ger40|dax)\b/i, "GER40"],
    [/\b(forex|fx|major pairs|majors|currenc(?:y|ies))\b/i, "Forex Majors"],
    [/\b(indices|index)\b/i, "Equity Indices"],
    [/\b(crypto|btc|eth|bitcoin)\b/i, "Crypto CFDs"],
  ];
  for (const [regex, label] of symbolMatchers) {
    if (regex.test(text) && !instruments.includes(label)) instruments.push(label);
  }

  const timeframes: string[] = [];
  const tfMatchers: Array<[RegExp, string]> = [
    [/\b(1\s*m|m1|1-minute|1 minute|tick)\b/i, "M1"],
    [/\b(5\s*m|m5|5-minute|5 minute)\b/i, "M5"],
    [/\b(15\s*m|m15|15-minute|15 minute)\b/i, "M15"],
    [/\b(30\s*m|m30|30-minute|30 minute)\b/i, "M30"],
    [/\b(1\s*h|h1|1-hour|1 hour|hourly)\b/i, "H1"],
    [/\b(4\s*h|h4|4-hour|4 hour)\b/i, "H4"],
    [/\b(d1|daily|1d)\b/i, "D1"],
    [/\b(w1|weekly)\b/i, "W1"],
  ];
  for (const [regex, label] of tfMatchers) {
    if (regex.test(text) && !timeframes.includes(label)) timeframes.push(label);
  }

  const sessions: string[] = [];
  if (/\b(london|ldn|european session|frankfurt)\b/i.test(text)) sessions.push("London");
  if (/\b(new york|ny session|ny open|us session|wall street)\b/i.test(text)) sessions.push("New York");
  if (/\b(overlap|london\/ny|ldn\/ny)\b/i.test(text)) sessions.push("London/NY Overlap");
  if (/\b(asia|asian|tokyo|sydney)\b/i.test(text)) sessions.push("Asian");

  const entryAndStopLogic: string[] = [];
  if (/\b(stop[\s-]*loss|sl|invalidation)\b/i.test(text)) {
    if (/\b(swing high|swing low|structure|candle high|candle low|order block)\b/i.test(text)) {
      entryAndStopLogic.push("Structural invalidation stop-loss");
    } else if (/\b(atr|volatility)\b/i.test(text)) {
      entryAndStopLogic.push("ATR / volatility-adjusted stop-loss");
    } else if (/\b(\d+\s*pips?|\d+\s*points?)\b/i.test(text)) {
      entryAndStopLogic.push("Fixed pip/point stop-loss");
    } else {
      entryAndStopLogic.push("Defined stop-loss placement");
    }
  }
  if (/\b(breakeven|break-even|be|trail|partial)\b/i.test(text)) {
    entryAndStopLogic.push("Active trade management (partials / breakeven)");
  }

  // Extract R:R (e.g., "1:2", "1:3", "2R", "2.5R", "3 to 1")
  let rewardRisk: number | null = null;
  const rrColonMatch = text.match(/\b1\s*:\s*(\d+(?:\.\d+)?)\b/);
  const rrReverseMatch = text.match(/\b(\d+(?:\.\d+)?)\s*:\s*1\b/);
  const rrNumberMatch = text.match(/\b(\d+(?:\.\d+)?)\s*r(?:\b|rr)/i);
  if (rrColonMatch) rewardRisk = Number(rrColonMatch[1]);
  else if (rrReverseMatch) rewardRisk = Number(rrReverseMatch[1]);
  else if (rrNumberMatch && Number(rrNumberMatch[1]) <= 15) rewardRisk = Number(rrNumberMatch[1]);

  // Extract Risk % per trade (e.g., "risk 0.5%", "1% risk", "0.75% per trade")
  let riskPerTradePct: number | null = null;
  const riskMatch =
    text.match(/(?:risk(?:ing)?|size|per trade)[^.\n]{0,25}?(\d+(?:\.\d+)?)\s*%/i) ??
    text.match(/\b(\d+(?:\.\d+)?)\s*%\s*(?:risk|per trade|per setup)/i);
  if (riskMatch) {
    const val = Number(riskMatch[1]);
    if (val > 0 && val <= 10) riskPerTradePct = val;
  }

  // Extract trades per week estimate
  let tradesPerWeekEstimate: number | null = null;
  const tpwMatch = text.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*trades?\s*(?:per|a|\/)\s*week/i);
  const tpwSingle = text.match(/\b(\d+)\s*trades?\s*(?:per|a|\/)\s*week/i);
  const tpdSingle = text.match(/\b(\d+)\s*trades?\s*(?:per|a|\/)\s*day/i);
  if (tpwMatch) {
    tradesPerWeekEstimate = Math.round((Number(tpwMatch[1]) + Number(tpwMatch[2])) / 2);
  } else if (tpwSingle) {
    tradesPerWeekEstimate = Number(tpwSingle[1]);
  } else if (tpdSingle) {
    tradesPerWeekEstimate = Number(tpdSingle[1]) * 5;
  }

  // Holding behavior & weekend / overnight
  let inferredWeekendHolding: boolean | null = null;
  let inferredOvernightHolding: boolean | null = null;
  let holdingBehavior: string | null = null;

  if (/\b(no weekend|never hold[^.\n]{0,20}weekend|don't hold[^.\n]{0,20}weekend|do not hold[^.\n]{0,20}weekend|flat before friday|close before weekend|flat on friday)\b/i.test(lower)) {
    inferredWeekendHolding = false;
  } else if (/\b(hold[^.\n]{0,25}over (?:the )?weekends?|weekend hold|through (?:the )?weekends?|across (?:the )?weekends?|multi-week|several days to weeks)\b/i.test(lower)) {
    inferredWeekendHolding = true;
    inferredOvernightHolding = true;
    holdingBehavior = "Multi-day / weekend swing holding";
  }

  if (/\b(flat before rollover|close same day|intraday only|never hold overnight|flat by end of session|same session)\b/i.test(lower)) {
    inferredOvernightHolding = false;
    if (inferredWeekendHolding === null) inferredWeekendHolding = false;
    holdingBehavior = "Same-session intraday (flat before rollover)";
  } else if (/\b(overnight|2-4 days|few days|multi-day|swing)\b/i.test(lower)) {
    inferredOvernightHolding = true;
    if (!holdingBehavior) holdingBehavior = "Multi-day / overnight holding";
  } else if (/\b(minutes|15-60 min|1-3 hours|couple of hours|scalp)\b/i.test(lower)) {
    if (!holdingBehavior) holdingBehavior = "Short intraday (minutes to a few hours)";
  }

  const subThirtySecondScalpRisk = /\b(tick scalp|seconds|under 30s|10 seconds|15 seconds|high frequency|hft|ultra-short)\b/i.test(lower);

  // News behavior
  let inferredTradesNews: boolean | null = null;
  if (/\b(avoid news|flat before news|no news trading|stay out of news|step aside during cpi|don't trade news)\b/i.test(lower)) {
    inferredTradesNews = false;
  } else if (/\b(trade news|news trader|trade cpi|trade nfp|fomc release|straddle news|during high-impact news)\b/i.test(lower)) {
    inferredTradesNews = true;
  }

  // Automation / EA / Copiers / Hedging
  let inferredUsesAutomation: boolean | null = null;
  if (/\b(manual only|100% manual|purely discretionary|no ea|no bots)\b/i.test(lower)) {
    inferredUsesAutomation = false;
  } else if (/\b(ea|expert advisor|automated|algo|bot|cbot|pine script webhook)\b/i.test(lower)) {
    inferredUsesAutomation = true;
  }

  const hedgingOrMartingaleMentioned = /\b(martingale|grid|hedge|hedging|recoveryzones)\b/i.test(lower);
  const copyTradingMentioned = /\b(copy trad|trade copier|copier)\b/i.test(lower);

  // Inferred style
  let inferredStyle: TradingStyle | null = null;
  if (inferredTradesNews === true && /\b(news strategy|news trader|only trade news)\b/i.test(lower)) {
    inferredStyle = "news";
  } else if (/\b(scalp|scalper|scalping|m1|1-minute)\b/i.test(lower)) {
    inferredStyle = "scalping";
  } else if (/\b(swing|multi-day|h4|d1|daily chart)\b/i.test(lower) || inferredWeekendHolding === true) {
    inferredStyle = "swing";
  } else if (/\b(intraday|day trad|session|m5|m15|h1)\b/i.test(lower)) {
    inferredStyle = "intraday";
  }

  return {
    methodology,
    instruments,
    timeframes,
    sessions,
    entryAndStopLogic,
    rewardRisk,
    riskPerTradePct,
    tradesPerWeekEstimate,
    holdingBehavior,
    inferredStyle,
    inferredWeekendHolding,
    inferredOvernightHolding,
    inferredTradesNews,
    inferredUsesAutomation,
    subThirtySecondScalpRisk,
    hedgingOrMartingaleMentioned,
    copyTradingMentioned,
  };
}

export function evaluateConsultationReadiness(
  profile: TraderProfile,
  history: TradeHistorySummary | null
): ConsultationAssessment {
  const extracted = extractStrategyIntelligence(profile.strategyDescription);
  const followUps: ConsultationFollowUp[] = [];
  const suggestedPatch: Partial<TraderProfile> = {};

  if (extracted.inferredStyle && extracted.inferredStyle !== profile.tradingStyle) {
    suggestedPatch.tradingStyle = extracted.inferredStyle;
  }
  if (extracted.instruments.length > 0 && (!profile.marketsTraded || profile.marketsTraded === "Forex")) {
    suggestedPatch.marketsTraded = extracted.instruments.join(", ");
  }
  if (extracted.riskPerTradePct !== null && profile.riskPerTradePct === null) {
    suggestedPatch.riskPerTradePct = extracted.riskPerTradePct;
  }
  if (extracted.rewardRisk !== null && !profile.typicalRewardRisk) {
    suggestedPatch.typicalRewardRisk = extracted.rewardRisk;
  }
  if (extracted.tradesPerWeekEstimate !== null) {
    suggestedPatch.tradesPerWeek = extracted.tradesPerWeekEstimate;
  }
  if (extracted.timeframes.length > 0 && !profile.executionTimeframe) {
    suggestedPatch.executionTimeframe = extracted.timeframes.join(" / ");
  }
  if (extracted.sessions.length > 0 && !profile.primarySessions) {
    suggestedPatch.primarySessions = extracted.sessions.join(", ");
  }
  if (extracted.inferredWeekendHolding !== null) {
    suggestedPatch.requiresWeekendHolding = extracted.inferredWeekendHolding;
  }
  if (extracted.inferredTradesNews !== null) {
    suggestedPatch.tradesNews = extracted.inferredTradesNews;
  }
  if (extracted.inferredUsesAutomation !== null) {
    suggestedPatch.usesAutomation = extracted.inferredUsesAutomation;
  }

  // 1. Check contradictions between strategy narrative and profile checkboxes
  if (extracted.inferredWeekendHolding === true && !profile.requiresWeekendHolding) {
    followUps.push({
      id: "contradiction-weekend",
      type: "contradiction",
      question: "Your strategy description mentions holding positions across multiple days or weekends, but 'Hold positions over weekends' is unchecked.",
      context: "Standard FTMO funded accounts prohibit holding through market breaks >2 hours, whereas FundedNext and The5ers High Stakes allow weekend holding (with swap exposure).",
      options: [
        { label: "Yes, I need weekend holding", patch: { requiresWeekendHolding: true, tradingStyle: "swing" } },
        { label: "No, I always flatten before Friday close", patch: { requiresWeekendHolding: false } },
      ],
    });
  }

  if (extracted.inferredTradesNews === true && !profile.tradesNews) {
    followUps.push({
      id: "contradiction-news",
      type: "contradiction",
      question: "Your strategy description references macro or news releases, but 'My strategy trades around news events' is currently off.",
      context: "Prop firms distinguish between holding an already-open trade through a release versus executing a new order or stop/target within ±2 to ±5 minutes of a high-impact event.",
      options: [
        { label: "I execute orders around news windows", patch: { tradesNews: true } },
        { label: "I stay flat or only hold existing swings", patch: { tradesNews: false } },
      ],
    });
  }

  if (extracted.inferredUsesAutomation === true && !profile.usesAutomation) {
    followUps.push({
      id: "contradiction-ea",
      type: "contradiction",
      question: "You mentioned using an EA, bot, or automated execution in your notes, but automation is unchecked in your requirements.",
      context: "FundedNext prohibits EAs on Stellar accounts of $50,000 and above, and The5ers High Stakes automation policy is unverified in our catalogue.",
      options: [
        { label: "Require EA / Automation support", patch: { usesAutomation: true, executionMethod: "ea_bot" } },
        { label: "I execute all trades manually", patch: { usesAutomation: false, executionMethod: "manual" } },
      ],
    });
  }

  // 2. Check discrepancies between uploaded CSV history and stated profile
  if (history && (history.weekendTradesCount ?? 0) > 0 && !profile.requiresWeekendHolding) {
    followUps.push({
      id: "history-weekend-mismatch",
      type: "history_discrepancy",
      question: `Your imported trading history contains ${history.weekendTradesCount} trade(s) held across a weekend, yet your profile states you do not require weekend holding.`,
      context: "If holding over weekends is part of your real strategy edge, we should filter for accounts with verified weekend holding permissions.",
      options: [
        { label: "Require weekend holding permission", patch: { requiresWeekendHolding: true } },
        { label: "I will close all trades before Friday close", patch: { requiresWeekendHolding: false } },
      ],
    });
  }

  if (history && history.bestDayProfitShare !== null && history.bestDayProfitShare > 0.4 && !profile.avoidsConsistencyRules) {
    followUps.push({
      id: "history-consistency-exposure",
      type: "history_discrepancy",
      question: `In your trade history, your single best day accounted for ${(history.bestDayProfitShare * 100).toFixed(1)}% of total net profit. Should we exclude accounts with consistency rules?`,
      context: "FTMO 1-Step enforces a 50% Best Day rule and FundedNext On-Demand enforces a 40% Best Day rule. FTMO 2-Step and BrightFunded 2-Step have no Best Day consistency rule.",
      options: [
        { label: "Yes, avoid consistency rules", patch: { avoidsConsistencyRules: true } },
        { label: "Keep consistency-rule accounts in consideration", patch: { avoidsConsistencyRules: false } },
      ],
    });
  }

  // 3. Check missing critical risk parameters
  if (profile.riskPerTradePct === null) {
    followUps.push({
      id: "missing-risk-per-trade",
      type: "missing_detail",
      question: "What percentage of account balance do you typically risk per trade setup?",
      context: "Knowing your exact risk per trade allows the advisory engine to stress-test your consecutive losing streaks against 3%, 4%, and 5% daily loss limits.",
      options: [
        { label: "0.25% – Conservative", patch: { riskPerTradePct: 0.25 } },
        { label: "0.50% – Moderate Prop Sizing", patch: { riskPerTradePct: 0.5 } },
        { label: "1.00% – Standard Sizing", patch: { riskPerTradePct: 1.0 } },
        { label: "1.50%+ – Aggressive", patch: { riskPerTradePct: 1.5 } },
      ],
    });
  }

  if (!profile.strategyDescription || profile.strategyDescription.trim().length < 25) {
    followUps.push({
      id: "missing-strategy-narrative",
      type: "missing_detail",
      question: "How do you identify a setup, place your stop-loss, and decide when to exit?",
      context: "Describing your entry trigger, timeframe, session, and stop placement helps tailor the rule-by-rule management guidance to your exact edge.",
      options: [
        {
          label: "London/NY M15 intraday structure & liquidity sweeps (0.5% risk)",
          patch: {
            strategyDescription:
              "I trade EUR/USD and GBP/USD during the London and NY overlap using H1 structure and M15 liquidity sweeps. Stop-loss goes beyond the sweep candle high/low risking 0.5% per trade for a 1:2.5 target. All trades are closed before daily rollover; I avoid executing within 15 minutes of high-impact news.",
            tradingStyle: "intraday",
            marketsTraded: "EUR/USD, GBP/USD",
            riskPerTradePct: 0.5,
            typicalRewardRisk: 2.5,
            executionTimeframe: "M15 / H1",
            primarySessions: "London, London/NY Overlap",
            requiresWeekendHolding: false,
          },
        },
        {
          label: "H4/D1 multi-day swing continuation on Forex & Gold (0.75% risk)",
          patch: {
            strategyDescription:
              "I trade H4 and Daily trend pullbacks on EUR/USD, USD/JPY, and XAU/USD. Entries are confirmed on H4 closes with ATR-based stops risking 0.75% per trade for 2R–3R targets. Positions are routinely held for 2 to 6 days including overnight and occasionally over weekends.",
            tradingStyle: "swing",
            marketsTraded: "EUR/USD, USD/JPY, XAU/USD",
            riskPerTradePct: 0.75,
            typicalRewardRisk: 2.5,
            executionTimeframe: "H4 / D1",
            primarySessions: "London, New York",
            requiresWeekendHolding: true,
            holdsOvernight: true,
          },
        },
      ],
    });
  }

  // 4. Operational alerts for specialized execution risks
  if (extracted.subThirtySecondScalpRisk || (history && (history.shortHoldTradesCount ?? 0) > 0)) {
    followUps.push({
      id: "operational-sub30s-scalp",
      type: "operational_alert",
      question: "Sub-30-second trade duration detected in your profile or trade history.",
      context: "FundedNext Stellar 2-Step enforces a 'Quick Strike' threshold where trades closed within 30 seconds must remain below 30% during the Challenge, and prohibits tick scalping.",
      options: [],
    });
  }

  // Completeness score calculation
  let completedChecks = 0;
  const totalChecks = 6;
  if (profile.strategyDescription.trim().length >= 25) completedChecks += 1;
  if (profile.marketsTraded.trim().length > 0) completedChecks += 1;
  if (profile.riskPerTradePct !== null && profile.riskPerTradePct > 0) completedChecks += 1;
  if (profile.maxBudget > 0 && profile.minimumAccountSize >= 0) completedChecks += 1;
  if (history && history.tradeCount > 0) completedChecks += 1;
  if (followUps.filter((f) => f.type === "contradiction").length === 0) completedChecks += 1;

  return {
    extracted,
    followUps,
    completenessPct: Math.round((completedChecks / totalChecks) * 100),
    suggestedPatch,
  };
}
