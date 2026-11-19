export type TradeField =
  | "symbol"
  | "side"
  | "openTime"
  | "closeTime"
  | "profit"
  | "commission"
  | "swap"
  | "riskAmount"
  | "tradeId"
  | "balance"
  | "equity";

export type TradeColumnMap = Partial<Record<TradeField, number>>;

export type ClosedTrade = {
  rowNumber: number;
  tradeId: string | null;
  symbol: string;
  side: "long" | "short";
  openTime: string;
  closeTime: string;
  netProfit: number;
  riskAmount: number | null;
  observedBalance: number | null;
  observedEquity: number | null;
};

export type CsvPreview = {
  headers: string[];
  suggestedMapping: TradeColumnMap;
  mapping: TradeColumnMap;
  totalRows: number;
  validRows: number;
  invalidRows: Array<{ rowNumber: number; errors: string[] }>;
  duplicateRows: number[];
  trades: ClosedTrade[];
  unmappedHeaders: string[];
  warnings: string[];
};

export type SessionPerformance = {
  session: string;
  trades: number;
  wins: number;
  winRate: number;
  netProfit: number;
};

export type PerformanceHalfSummary = {
  trades: number;
  winRate: number;
  netProfit: number;
  profitFactor: number | null;
};

export type BehavioralFinding = {
  id: string;
  category: "edge" | "concentration" | "risk" | "holding" | "session" | "stability";
  severity: "positive" | "neutral" | "caution" | "warning";
  title: string;
  detail: string;
  evidenceBasis: "confirmed" | "estimated";
};

export type TradeMetrics = {
  tradeCount: number;
  wins: number;
  losses: number;
  breakeven: number;
  netProfit: number;
  winRate: number | null;
  averageWin: number | null;
  averageLoss: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  outlierLossRatio: number | null;
  profitFactor: number | null;
  expectancy: number;
  averageRewardRisk: number | null;
  averageRealizedR: number | null;
  tradesWithRiskAmount: number;
  riskConsistencyCv: number | null;
  averageTradesPerActiveWeek: number | null;
  averageTradesPerActiveDay: number | null;
  averageHoldingMinutes: number;
  medianHoldingMinutes: number;
  minHoldingMinutes: number;
  maxHoldingMinutes: number;
  shortHoldTradesCount: number;
  overnightTradesCount: number;
  weekendTradesCount: number;
  maximumBalanceDrawdown: number;
  maximumSampledEquityDrawdown: number | null;
  largestRealizedDailyLoss: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  bestDayProfitShare: number | null;
  topThreeTradesProfitShare: number | null;
  instruments: Array<{ symbol: string; trades: number; netProfit: number; winRate?: number }>;
  daysOfWeek: Array<{ day: string; trades: number; netProfit: number }>;
  sessions: SessionPerformance[];
  directionPerformance: Array<{ side: "long" | "short"; trades: number; netProfit: number; winRate: number }>;
  dailyResults: Array<{ date: string; netProfit: number; cumulativeProfit: number }>;
  performanceHalfComparison: {
    firstHalf: PerformanceHalfSummary;
    secondHalf: PerformanceHalfSummary;
  } | null;
  behavioralFindings: BehavioralFinding[];
  limitations: string[];
};

export type TradeAnalysis = { trades: ClosedTrade[]; metrics: TradeMetrics; warnings: string[] };

/** Only derived, non-identifying aggregates are retained for account analysis. */
export type TradeHistorySummary = {
  tradeCount: number;
  averageHoldingMinutes: number;
  averageTradesPerActiveWeek: number | null;
  maxLosingStreak: number;
  largestRealizedDailyLossPct: number | null;
  maximumBalanceDrawdownPct: number | null;
  profitFactor: number | null;
  expectancy: number;
  bestDayProfitShare: number | null;
  // Extended diagnostic aggregates for deep advisory consultation
  startingBalance?: number;
  outcomes?: Pick<TradeMetrics, "wins" | "losses" | "breakeven">;
  maximumBalanceDrawdown?: number;
  netProfit?: number;
  winRate?: number | null;
  averageWin?: number | null;
  averageLoss?: number | null;
  largestLoss?: number | null;
  outlierLossRatio?: number | null;
  averageRewardRisk?: number | null;
  averageRealizedR?: number | null;
  maxWinningStreak?: number;
  topThreeTradesProfitShare?: number | null;
  shortHoldTradesCount?: number;
  overnightTradesCount?: number;
  weekendTradesCount?: number;
  maximumSampledEquityDrawdownPct?: number | null;
  riskConsistencyCv?: number | null;
  topInstruments?: Array<{ symbol: string; trades: number; netProfit: number }>;
  sessions?: SessionPerformance[];
  behavioralFindings?: BehavioralFinding[];
  limitations?: string[];
};
