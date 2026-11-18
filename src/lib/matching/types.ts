export type TradingStyle = "scalping" | "intraday" | "swing" | "news";

export type DrawdownType = "static" | "trailing" | "unknown";

export type RuleStatus = "verified" | "unverified";
export type ConstraintStatus = "allowed" | "restricted" | "prohibited" | "unknown";

export type RuleValue<T> = {
  value: T;
  status: RuleStatus;
  sourceUrl?: string;
  verifiedAt?: string;
  note?: string;
};

export type TraderProfile = {
  tradingStyle: TradingStyle;
  strategyDescription: string;
  tradesPerWeek: number;
  requiresWeekendHolding: boolean;
  preferredDrawdown: "static" | "trailing" | "either";
  maxBudget: number;
  budgetCurrency: "USD" | "EUR";
  minimumAccountSize: number;
  avoidsConsistencyRules: boolean;
  tradesNews: boolean;
  usesAutomation: boolean;
  marketsTraded: string;
  riskPerTradePct: number | null;
  // Extended consultation fields (optional for backward compatibility)
  analysisTimeframe?: string;
  executionTimeframe?: string;
  primarySessions?: string;
  entryAndConfirmLogic?: string;
  stopLossLogic?: string;
  takeProfitLogic?: string;
  typicalRewardRisk?: number | null;
  typicalHoldingDuration?: string;
  holdsOvernight?: boolean;
  expectedMaxLosingStreak?: number | null;
  executionMethod?: "manual" | "ea_bot" | "semi_automated" | "copy_trading";
  usesHedgingOrGrid?: boolean;
  preferredEvaluationPhases?: "1-step" | "2-step" | "either";
  primaryObjective?: "lowest_cost" | "fastest_funding" | "safest_drawdown" | "highest_payout_split";
  experienceYears?: number | null;
};

export type FirmAccount = {
  id: string;
  firmName: string;
  programmeName: string;
  accountSize: number;
  accountSizeEvidence: RuleValue<number>;
  priceCurrency: "EUR" | "USD";
  price: RuleValue<number | null>;
  basePrice?: RuleValue<number | null>;
  evaluationPhases: RuleValue<number | null>;
  profitTargetsPct: RuleValue<number[] | null>;
  dailyLossLimitPct: RuleValue<number | null>;
  overallLossLimitPct: RuleValue<number | null>;
  lossCalculation: RuleValue<string | null>;
  dailyReset: RuleValue<string | null>;
  minimumTradingDays: RuleValue<string | null>;
  timeLimit: RuleValue<string | null>;
  drawdownType: RuleValue<DrawdownType>;
  newsRule: RuleValue<string | null>;
  newsExecution: RuleValue<ConstraintStatus>;
  automationRule: RuleValue<ConstraintStatus>;
  weekendHolding: RuleValue<"allowed" | "prohibited" | "unknown">;
  weekendRule: RuleValue<string | null>;
  consistencyRule: RuleValue<"present" | "absent" | "unknown">;
  consistencyDetails: RuleValue<string | null>;
  supportedStyles: RuleValue<TradingStyle[]>;
  payoutTerms: RuleValue<string | null>;
  profitSplit: RuleValue<string | null>;
  feeTerms: RuleValue<string | null>;
  otherRestrictions: RuleValue<string | null>;
};

export type MatchResult = {
  accountId: string;
  firmName: string;
  programmeName: string;
  eligible: boolean;
  score: number | null;
  reasons: string[];
  warnings: string[];
};
