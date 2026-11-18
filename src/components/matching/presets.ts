import type { TraderProfile, TradingStyle } from "@/lib/matching/types";

export const styles: Array<{ value: TradingStyle; label: string }> = [
  { value: "scalping", label: "Scalping" },
  { value: "intraday", label: "Day trading" },
  { value: "swing", label: "Swing trading" },
  { value: "news", label: "News trading" },
];

export const profilePresets: Array<{ label: string; patch: Partial<TraderProfile> }> = [
  {
    label: "Day trader",
    patch: {
      tradingStyle: "intraday",
      strategyDescription:
        "I trade EUR/USD and GBP/USD during the London and NY overlap using H1 structure and M15 liquidity sweeps. Stop-loss goes beyond the sweep high/low risking 0.5% per trade for a 1:2.5 target. All positions are closed before daily rollover.",
      marketsTraded: "EUR/USD, GBP/USD",
      tradesPerWeek: 8,
      requiresWeekendHolding: false,
      tradesNews: false,
      usesAutomation: false,
      avoidsConsistencyRules: true,
      preferredDrawdown: "static",
      maxBudget: 250,
      budgetCurrency: "EUR",
      minimumAccountSize: 10_000,
      riskPerTradePct: 0.5,
      typicalRewardRisk: 2.5,
      executionTimeframe: "M15 / H1",
      primarySessions: "London, London/NY Overlap",
    },
  },
  {
    label: "Scalper",
    patch: {
      tradingStyle: "scalping",
      strategyDescription:
        "I trade M1/M5 momentum breakouts on EUR/USD and XAU/USD at London open. Tight structural stops risking 0.4% per trade for 1.5R–2R targets, holding for 5 to 25 minutes. Flat before news releases and rollover.",
      marketsTraded: "EUR/USD, XAU/USD",
      tradesPerWeek: 25,
      requiresWeekendHolding: false,
      tradesNews: false,
      usesAutomation: false,
      avoidsConsistencyRules: false,
      preferredDrawdown: "either",
      maxBudget: 150,
      budgetCurrency: "USD",
      minimumAccountSize: 6_000,
      riskPerTradePct: 0.4,
      typicalRewardRisk: 1.8,
      executionTimeframe: "M1 / M5",
      primarySessions: "London Open",
    },
  },
  {
    label: "Swing trader",
    patch: {
      tradingStyle: "swing",
      strategyDescription:
        "I trade H4 and Daily pullbacks on EUR/USD, USD/JPY, and Gold. ATR-based stop-loss risking 0.75% per trade for 1:3 targets. I regularly hold trades for 3 to 6 days including overnight and over weekends.",
      marketsTraded: "EUR/USD, USD/JPY, XAU/USD",
      tradesPerWeek: 3,
      requiresWeekendHolding: true,
      tradesNews: false,
      usesAutomation: false,
      avoidsConsistencyRules: false,
      preferredDrawdown: "static",
      maxBudget: 250,
      budgetCurrency: "USD",
      minimumAccountSize: 15_000,
      riskPerTradePct: 0.75,
      typicalRewardRisk: 3.0,
      executionTimeframe: "H4 / D1",
      primarySessions: "London, New York",
    },
  },
  {
    label: "News trader",
    patch: {
      tradingStyle: "news",
      strategyDescription:
        "I trade macro volatility expansions around CPI, NFP, and central bank rate decisions on USD pairs and Gold, risking 0.5% per setup with defined invalidation.",
      marketsTraded: "USD Majors, XAU/USD",
      tradesPerWeek: 4,
      requiresWeekendHolding: false,
      tradesNews: true,
      usesAutomation: false,
      avoidsConsistencyRules: false,
      preferredDrawdown: "either",
      maxBudget: 150,
      budgetCurrency: "USD",
      minimumAccountSize: 6_000,
      riskPerTradePct: 0.5,
      typicalRewardRisk: 2.0,
      executionTimeframe: "M5 / M15",
      primarySessions: "New York",
    },
  },
];
