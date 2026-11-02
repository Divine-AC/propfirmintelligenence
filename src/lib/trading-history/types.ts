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

export type TradeMetrics = {
  tradeCount: number;
  wins: number;
  losses: number;
  breakeven: number;
  netProfit: number;
  winRate: number | null;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  expectancy: number;
  averageRewardRisk: number | null;
  averageRealizedR: number | null;
  tradesWithRiskAmount: number;
  averageTradesPerActiveWeek: number | null;
  averageTradesPerActiveDay: number | null;
  averageHoldingMinutes: number;
  maximumBalanceDrawdown: number;
  maximumSampledEquityDrawdown: number | null;
  largestRealizedDailyLoss: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  bestDayProfitShare: number | null;
  instruments: Array<{ symbol: string; trades: number; netProfit: number }>;
  daysOfWeek: Array<{ day: string; trades: number; netProfit: number }>;
  directionPerformance: Array<{ side: "long" | "short"; trades: number; netProfit: number; winRate: number }>;
  dailyResults: Array<{ date: string; netProfit: number; cumulativeProfit: number }>;
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
};
