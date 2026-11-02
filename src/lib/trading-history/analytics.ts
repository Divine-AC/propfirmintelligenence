import type { ClosedTrade, TradeAnalysis, TradeMetrics } from "./types";

function weekKey(date: Date): string {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - weekday + 1);
  return monday.toISOString().slice(0, 10);
}

function maximumDrawdown(values: number[]): number {
  let peak = Number.NEGATIVE_INFINITY;
  let drawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, peak - value);
  }
  return drawdown;
}

export function analyzeTrades(sourceTrades: ClosedTrade[], startingBalance = 0, warnings: string[] = []): TradeAnalysis {
  if (!sourceTrades.length) throw new Error("At least one valid trade is required.");
  const trades = [...sourceTrades].sort((a, b) => Date.parse(a.closeTime) - Date.parse(b.closeTime) || a.rowNumber - b.rowNumber);
  const wins = trades.filter((trade) => trade.netProfit > 0);
  const losses = trades.filter((trade) => trade.netProfit < 0);
  const breakeven = trades.length - wins.length - losses.length;
  const netProfit = trades.reduce((sum, trade) => sum + trade.netProfit, 0);
  const averageWin = wins.length ? wins.reduce((sum, trade) => sum + trade.netProfit, 0) / wins.length : null;
  const averageLoss = losses.length ? losses.reduce((sum, trade) => sum + trade.netProfit, 0) / losses.length : null;
  const grossWins = wins.reduce((sum, trade) => sum + trade.netProfit, 0);
  const grossLosses = Math.abs(losses.reduce((sum, trade) => sum + trade.netProfit, 0));
  const riskTrades = trades.filter((trade) => trade.riskAmount !== null);
  const realizedR = riskTrades.length
    ? riskTrades.reduce((sum, trade) => sum + trade.netProfit / (trade.riskAmount as number), 0) / riskTrades.length
    : null;

  const daily = new Map<string, number>();
  const byInstrument = new Map<string, { trades: number; netProfit: number }>();
  const byWeek = new Set<string>();
  const byDayName = new Map<string, { trades: number; netProfit: number }>();
  const byDirection = new Map<"long" | "short", { trades: number; wins: number; netProfit: number }>();
  let holdingMilliseconds = 0;
  let winningStreak = 0;
  let losingStreak = 0;
  let maxWinningStreak = 0;
  let maxLosingStreak = 0;
  let cumulativeProfit = 0;
  const dailyResults: TradeMetrics["dailyResults"] = [];
  for (const trade of trades) {
    const date = new Date(trade.closeTime);
    const key = date.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + trade.netProfit);
    byWeek.add(weekKey(date));
    const symbol = byInstrument.get(trade.symbol) ?? { trades: 0, netProfit: 0 };
    symbol.trades += 1; symbol.netProfit += trade.netProfit; byInstrument.set(trade.symbol, symbol);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const day = byDayName.get(dayName) ?? { trades: 0, netProfit: 0 };
    day.trades += 1; day.netProfit += trade.netProfit; byDayName.set(dayName, day);
    const direction = byDirection.get(trade.side) ?? { trades: 0, wins: 0, netProfit: 0 };
    direction.trades += 1; direction.netProfit += trade.netProfit;
    if (trade.netProfit > 0) { direction.wins += 1; winningStreak += 1; losingStreak = 0; }
    else if (trade.netProfit < 0) { losingStreak += 1; winningStreak = 0; }
    else { winningStreak = 0; losingStreak = 0; }
    maxWinningStreak = Math.max(maxWinningStreak, winningStreak);
    maxLosingStreak = Math.max(maxLosingStreak, losingStreak);
    byDirection.set(trade.side, direction);
    holdingMilliseconds += Date.parse(trade.closeTime) - Date.parse(trade.openTime);
  }

  const sortedDays = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  for (const [date, dayProfit] of sortedDays) {
    running += dayProfit;
    dailyResults.push({ date, netProfit: dayProfit, cumulativeProfit: running });
  }
  const hasAllBalances = trades.every((trade) => trade.observedBalance !== null);
  const balanceSeries = hasAllBalances
    ? [startingBalance, ...trades.map((trade) => trade.observedBalance as number)]
    : [startingBalance, ...trades.map((trade) => { cumulativeProfit += trade.netProfit; return startingBalance + cumulativeProfit; })];
  const hasAllEquities = trades.every((trade) => trade.observedEquity !== null);
  const equityDrawdown = hasAllEquities ? maximumDrawdown([startingBalance, ...trades.map((trade) => trade.observedEquity as number)]) : null;
  const dailyProfits = sortedDays.map(([, profit]) => profit);
  const bestDayProfit = Math.max(...dailyProfits);
  const limitations = [
    hasAllBalances
      ? "Balance drawdown uses only the balance values present in the export; it may miss movement between exported rows."
      : "Balance drawdown is estimated from closed-trade results and starting balance; intratrade balance changes are unavailable.",
    hasAllEquities
      ? "Equity drawdown uses sampled equity values at exported rows and cannot establish the maximum intratrade floating loss."
      : "Maximum equity drawdown is unavailable because the export does not include equity values for every trade.",
    "Daily results use UTC dates; a prop firm's session boundary may use a different timezone.",
  ];
  if (riskTrades.length < trades.length) limitations.push(`Realized R-multiple covers ${riskTrades.length} of ${trades.length} trades with a supplied risk amount.`);
  if (!losses.length) limitations.push("Profit factor and average win/loss ratio need at least one winning and one losing trade.");

  const metrics: TradeMetrics = {
    tradeCount: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    netProfit,
    winRate: wins.length / trades.length,
    averageWin,
    averageLoss,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : null,
    expectancy: netProfit / trades.length,
    averageRewardRisk: averageWin !== null && averageLoss !== null ? averageWin / Math.abs(averageLoss) : null,
    averageRealizedR: realizedR,
    tradesWithRiskAmount: riskTrades.length,
    averageTradesPerActiveWeek: byWeek.size ? trades.length / byWeek.size : null,
    averageTradesPerActiveDay: daily.size ? trades.length / daily.size : null,
    averageHoldingMinutes: holdingMilliseconds / trades.length / 60_000,
    maximumBalanceDrawdown: maximumDrawdown(balanceSeries),
    maximumSampledEquityDrawdown: equityDrawdown,
    largestRealizedDailyLoss: Math.max(0, ...dailyProfits.map((profit) => -profit)),
    maxWinningStreak,
    maxLosingStreak,
    bestDayProfitShare: netProfit > 0 ? bestDayProfit / netProfit : null,
    instruments: [...byInstrument].map(([symbol, values]) => ({ symbol, ...values })).sort((a, b) => b.trades - a.trades || a.symbol.localeCompare(b.symbol)),
    daysOfWeek: [...byDayName].map(([day, values]) => ({ day, ...values })).sort((a, b) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(a.day) - ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(b.day)),
    directionPerformance: [...byDirection].map(([side, values]) => ({ side, trades: values.trades, netProfit: values.netProfit, winRate: values.wins / values.trades })),
    dailyResults,
    limitations,
  };
  return { trades, metrics, warnings };
}
