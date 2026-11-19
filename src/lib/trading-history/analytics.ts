import type {
  BehavioralFinding,
  ClosedTrade,
  PerformanceHalfSummary,
  SessionPerformance,
  TradeAnalysis,
  TradeHistorySummary,
  TradeMetrics,
} from "./types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function classifyUtcSession(utcHour: number): string {
  if (utcHour >= 0 && utcHour < 7) return "Asian (00:00–07:00 UTC)";
  if (utcHour >= 7 && utcHour < 12) return "London (07:00–12:00 UTC)";
  if (utcHour >= 12 && utcHour < 16) return "London / NY Overlap (12:00–16:00 UTC)";
  if (utcHour >= 16 && utcHour < 21) return "New York (16:00–21:00 UTC)";
  return "Late NY / Rollover (21:00–24:00 UTC)";
}

function crossesWeekend(openDate: Date, closeDate: Date): boolean {
  const openDay = openDate.getUTCDay();
  const closeDay = closeDate.getUTCDay();
  if (openDay === 0 || openDay === 6 || closeDay === 0 || closeDay === 6) return true;
  const durationHours = (closeDate.getTime() - openDate.getTime()) / 3_600_000;
  if (durationHours >= 48) {
    // Check if any hour between openDate and closeDate falls on Saturday (6) or Sunday (0)
    const cursor = new Date(Date.UTC(openDate.getUTCFullYear(), openDate.getUTCMonth(), openDate.getUTCDate()));
    const endDay = new Date(Date.UTC(closeDate.getUTCFullYear(), closeDate.getUTCMonth(), closeDate.getUTCDate()));
    while (cursor <= endDay) {
      const day = cursor.getUTCDay();
      if (day === 0 || day === 6) return true;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  // Also if opened on Friday (5) and closed on Monday (1) or later
  if (openDay === 5 && closeDate.getTime() - openDate.getTime() > 24 * 3_600_000 && closeDay !== 5) {
    return true;
  }
  return false;
}

function summarizeHalf(subset: ClosedTrade[]): PerformanceHalfSummary {
  const wins = subset.filter((t) => t.netProfit > 0);
  const losses = subset.filter((t) => t.netProfit < 0);
  const netProfit = subset.reduce((s, t) => s + t.netProfit, 0);
  const grossWins = wins.reduce((s, t) => s + t.netProfit, 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.netProfit, 0));
  return {
    trades: subset.length,
    winRate: subset.length ? wins.length / subset.length : 0,
    netProfit,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : null,
  };
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
  const largestWin = wins.length ? Math.max(...wins.map((t) => t.netProfit)) : null;
  const largestLoss = losses.length ? Math.min(...losses.map((t) => t.netProfit)) : null;
  const outlierLossRatio =
    largestLoss !== null && averageLoss !== null && averageLoss < 0
      ? Math.abs(largestLoss) / Math.abs(averageLoss)
      : null;

  const grossWins = wins.reduce((sum, trade) => sum + trade.netProfit, 0);
  const grossLosses = Math.abs(losses.reduce((sum, trade) => sum + trade.netProfit, 0));
  const riskTrades = trades.filter((trade) => trade.riskAmount !== null);
  const realizedR = riskTrades.length
    ? riskTrades.reduce((sum, trade) => sum + trade.netProfit / (trade.riskAmount as number), 0) / riskTrades.length
    : null;

  let riskConsistencyCv: number | null = null;
  if (riskTrades.length >= 2) {
    const riskValues = riskTrades.map((t) => t.riskAmount as number);
    const meanRisk = riskValues.reduce((s, v) => s + v, 0) / riskValues.length;
    if (meanRisk > 0) {
      const variance = riskValues.reduce((s, v) => s + (v - meanRisk) ** 2, 0) / riskValues.length;
      riskConsistencyCv = Math.sqrt(variance) / meanRisk;
    }
  }

  const daily = new Map<string, number>();
  const byInstrument = new Map<string, { trades: number; wins: number; netProfit: number }>();
  const byWeek = new Set<string>();
  const byDayName = new Map<string, { trades: number; netProfit: number }>();
  const byDirection = new Map<"long" | "short", { trades: number; wins: number; netProfit: number }>();
  const sessionOrder = [
    "Asian (00:00–07:00 UTC)",
    "London (07:00–12:00 UTC)",
    "London / NY Overlap (12:00–16:00 UTC)",
    "New York (16:00–21:00 UTC)",
    "Late NY / Rollover (21:00–24:00 UTC)",
  ];
  const bySession = new Map<string, { trades: number; wins: number; netProfit: number }>();

  let holdingMilliseconds = 0;
  const holdMinutesList: number[] = [];
  let shortHoldTradesCount = 0;
  let overnightTradesCount = 0;
  let weekendTradesCount = 0;
  let winningStreak = 0;
  let losingStreak = 0;
  let maxWinningStreak = 0;
  let maxLosingStreak = 0;
  let cumulativeProfit = 0;
  const dailyResults: TradeMetrics["dailyResults"] = [];

  for (const trade of trades) {
    const openDate = new Date(trade.openTime);
    const closeDate = new Date(trade.closeTime);
    const key = closeDate.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + trade.netProfit);
    byWeek.add(weekKey(closeDate));

    const symbol = byInstrument.get(trade.symbol) ?? { trades: 0, wins: 0, netProfit: 0 };
    symbol.trades += 1;
    if (trade.netProfit > 0) symbol.wins += 1;
    symbol.netProfit += trade.netProfit;
    byInstrument.set(trade.symbol, symbol);

    const dayName = WEEKDAYS[(closeDate.getUTCDay() + 6) % 7];
    const day = byDayName.get(dayName) ?? { trades: 0, netProfit: 0 };
    day.trades += 1;
    day.netProfit += trade.netProfit;
    byDayName.set(dayName, day);

    const sessionLabel = classifyUtcSession(openDate.getUTCHours());
    const sess = bySession.get(sessionLabel) ?? { trades: 0, wins: 0, netProfit: 0 };
    sess.trades += 1;
    if (trade.netProfit > 0) sess.wins += 1;
    sess.netProfit += trade.netProfit;
    bySession.set(sessionLabel, sess);

    const direction = byDirection.get(trade.side) ?? { trades: 0, wins: 0, netProfit: 0 };
    direction.trades += 1;
    direction.netProfit += trade.netProfit;
    if (trade.netProfit > 0) {
      direction.wins += 1;
      winningStreak += 1;
      losingStreak = 0;
    } else if (trade.netProfit < 0) {
      losingStreak += 1;
      winningStreak = 0;
    } else {
      winningStreak = 0;
      losingStreak = 0;
    }
    maxWinningStreak = Math.max(maxWinningStreak, winningStreak);
    maxLosingStreak = Math.max(maxLosingStreak, losingStreak);
    byDirection.set(trade.side, direction);

    const durationMs = Date.parse(trade.closeTime) - Date.parse(trade.openTime);
    holdingMilliseconds += durationMs;
    const durationMin = durationMs / 60_000;
    holdMinutesList.push(durationMin);
    if (durationMs <= 30_000) shortHoldTradesCount += 1;
    if (trade.openTime.slice(0, 10) !== trade.closeTime.slice(0, 10)) overnightTradesCount += 1;
    if (crossesWeekend(openDate, closeDate)) weekendTradesCount += 1;
  }

  const sortedHold = [...holdMinutesList].sort((a, b) => a - b);
  const minHoldingMinutes = sortedHold[0] ?? 0;
  const maxHoldingMinutes = sortedHold[sortedHold.length - 1] ?? 0;
  const midIdx = Math.floor(sortedHold.length / 2);
  const medianHoldingMinutes =
    sortedHold.length % 2 === 0
      ? ((sortedHold[midIdx - 1] ?? 0) + (sortedHold[midIdx] ?? 0)) / 2
      : (sortedHold[midIdx] ?? 0);

  const sortedDays = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  for (const [date, dayProfit] of sortedDays) {
    running += dayProfit;
    dailyResults.push({ date, netProfit: dayProfit, cumulativeProfit: running });
  }
  const hasAllBalances = trades.every((trade) => trade.observedBalance !== null);
  const balanceSeries = hasAllBalances
    ? [startingBalance, ...trades.map((trade) => trade.observedBalance as number)]
    : [
        startingBalance,
        ...trades.map((trade) => {
          cumulativeProfit += trade.netProfit;
          return startingBalance + cumulativeProfit;
        }),
      ];
  const hasAllEquities = trades.every((trade) => trade.observedEquity !== null);
  const equityDrawdown = hasAllEquities
    ? maximumDrawdown([startingBalance, ...trades.map((trade) => trade.observedEquity as number)])
    : null;
  const dailyProfits = sortedDays.map(([, profit]) => profit);
  const bestDayProfit = Math.max(...dailyProfits);
  const bestDayProfitShare = netProfit > 0 ? bestDayProfit / netProfit : null;

  const sortedWinAmounts = wins.map((w) => w.netProfit).sort((a, b) => b - a);
  const topThreeWinSum = sortedWinAmounts.slice(0, 3).reduce((s, v) => s + v, 0);
  const topThreeTradesProfitShare = netProfit > 0 && wins.length > 0 ? topThreeWinSum / netProfit : null;

  const performanceHalfComparison =
    trades.length >= 4
      ? {
          firstHalf: summarizeHalf(trades.slice(0, Math.floor(trades.length / 2))),
          secondHalf: summarizeHalf(trades.slice(Math.floor(trades.length / 2))),
        }
      : null;

  const sessions: SessionPerformance[] = sessionOrder
    .filter((label) => bySession.has(label))
    .map((label) => {
      const s = bySession.get(label)!;
      return {
        session: label,
        trades: s.trades,
        wins: s.wins,
        winRate: s.wins / s.trades,
        netProfit: s.netProfit,
      };
    });

  const limitations = [
    hasAllBalances
      ? "Balance drawdown uses only the balance values present in the export; it may miss movement between exported rows."
      : "Balance drawdown is estimated from closed-trade results and starting balance; intratrade balance changes are unavailable.",
    hasAllEquities
      ? "Equity drawdown uses sampled equity values at exported rows and cannot establish the maximum intratrade floating loss."
      : "Maximum equity drawdown is unavailable because the export does not include equity values for every trade.",
    "Daily results use UTC dates; a prop firm's session boundary may use a different timezone.",
  ];
  if (riskTrades.length < trades.length) {
    limitations.push(`Realized R-multiple covers ${riskTrades.length} of ${trades.length} trades with a supplied risk amount.`);
  }
  if (!losses.length) {
    limitations.push("Profit factor and average win/loss ratio need at least one winning and one losing trade.");
  }

  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : null;
  const averageRewardRisk = averageWin !== null && averageLoss !== null ? averageWin / Math.abs(averageLoss) : null;
  const maxBalanceDd = maximumDrawdown(balanceSeries);
  const largestDailyLoss = Math.max(0, ...dailyProfits.map((profit) => -profit));
  const avgHoldMin = holdingMilliseconds / trades.length / 60_000;

  // Build plain-language behavioral findings grounded strictly in observed metrics
  const behavioralFindings: BehavioralFinding[] = [];

  if (netProfit > 0) {
    behavioralFindings.push({
      id: "overall-edge",
      category: "edge",
      severity: profitFactor !== null && profitFactor >= 1.4 ? "positive" : "neutral",
      title: "Positive Expectancy in Submitted Sample",
      detail: `Your strategy generated ${netProfit.toLocaleString("en-US", { maximumFractionDigits: 2 })} across ${trades.length} closed trades with a ${(wins.length / trades.length * 100).toFixed(1)}% win rate${profitFactor !== null ? ` and a profit factor of ${profitFactor.toFixed(2)}` : ""}.`,
      evidenceBasis: "confirmed",
    });
  } else {
    behavioralFindings.push({
      id: "overall-edge-negative",
      category: "edge",
      severity: "warning",
      title: "Unprofitable Historical Sample",
      detail: `The submitted sample of ${trades.length} closed trades has a net result of ${netProfit.toLocaleString("en-US", { maximumFractionDigits: 2 })}. Purchasing an evaluation before establishing positive expectancy on demo increases the likelihood of losing the entry fee.`,
      evidenceBasis: "confirmed",
    });
  }

  if (bestDayProfitShare !== null && bestDayProfitShare > 0.4) {
    behavioralFindings.push({
      id: "profit-concentration-day",
      category: "concentration",
      severity: bestDayProfitShare > 0.5 ? "warning" : "caution",
      title: "High Single-Day Profit Concentration",
      detail: `Your single best trading day accounts for ${(bestDayProfitShare * 100).toFixed(1)}% of total net profit${topThreeTradesProfitShare !== null ? ` (and your top 3 trades represent ${(topThreeTradesProfitShare * 100).toFixed(0)}% of net profit)` : ""}. Programmes with 40%–50% Best Day consistency rules (such as FTMO 1-Step or FundedNext On-Demand payouts) would require you to generate additional distributed profit before passing or withdrawing.`,
      evidenceBasis: "confirmed",
    });
  } else if (bestDayProfitShare !== null && trades.length >= 5) {
    behavioralFindings.push({
      id: "profit-concentration-balanced",
      category: "concentration",
      severity: "positive",
      title: "Well-Distributed Daily Profits",
      detail: `Your highest-earning UTC day accounts for ${(bestDayProfitShare * 100).toFixed(1)}% of net profit, which sits comfortably below typical 40%–50% prop-firm best-day consistency thresholds.`,
      evidenceBasis: "confirmed",
    });
  }

  if (maxLosingStreak >= 3 || (startingBalance > 0 && largestDailyLoss / startingBalance >= 0.025)) {
    const dailyPctText = startingBalance > 0 ? ` (${(largestDailyLoss / startingBalance * 100).toFixed(2)}% of starting balance)` : "";
    behavioralFindings.push({
      id: "streak-daily-exposure",
      category: "risk",
      severity: startingBalance > 0 && largestDailyLoss / startingBalance >= 0.03 ? "warning" : "caution",
      title: "Losing Streak & Daily Drawdown Exposure",
      detail: `Your longest observed losing streak is ${maxLosingStreak} consecutive trade(s), and your largest realized UTC daily loss is ${largestDailyLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })}${dailyPctText}. Note that prop-firm daily limits also include intratrade floating drawdowns, so tighter 3%–4% daily limits require strict daily stop protocols.`,
      evidenceBasis: hasAllEquities ? "confirmed" : "estimated",
    });
  }

  if (outlierLossRatio !== null && outlierLossRatio >= 1.8 && losses.length >= 2) {
    behavioralFindings.push({
      id: "outlier-loss",
      category: "risk",
      severity: outlierLossRatio >= 2.5 ? "warning" : "caution",
      title: "Outlier Loss Behaviour Detected",
      detail: `Your largest single losing trade (${Math.abs(largestLoss!).toLocaleString("en-US", { maximumFractionDigits: 2 })}) is ${outlierLossRatio.toFixed(2)}× your average loss (${Math.abs(averageLoss!).toLocaleString("en-US", { maximumFractionDigits: 2 })}). Tail-risk losses are a primary cause of sudden daily loss breaches in prop evaluations.`,
      evidenceBasis: "confirmed",
    });
  }

  if (weekendTradesCount > 0 || overnightTradesCount > 0 || shortHoldTradesCount > 0) {
    const parts: string[] = [];
    if (overnightTradesCount > 0) parts.push(`${overnightTradesCount} trade(s) held across UTC midnight rollover`);
    if (weekendTradesCount > 0) parts.push(`${weekendTradesCount} trade(s) spanning or touching a weekend`);
    if (shortHoldTradesCount > 0) parts.push(`${shortHoldTradesCount} trade(s) closed within 30 seconds`);
    behavioralFindings.push({
      id: "holding-mechanics",
      category: "holding",
      severity: weekendTradesCount > 0 || shortHoldTradesCount > 0 ? "caution" : "neutral",
      title: "Observed Holding & Execution Cadence",
      detail: `Average hold time is ${Math.round(avgHoldMin)} minutes (median ${Math.round(medianHoldingMinutes)} min), with ${parts.join(", ")}. This directly determines whether weekend market-break rules, triple-swap rollover charges, or sub-30-second Quick Strike limits affect your execution.`,
      evidenceBasis: "confirmed",
    });
  } else {
    behavioralFindings.push({
      id: "holding-intraday-clean",
      category: "holding",
      severity: "positive",
      title: "Clean Intraday Session Closure",
      detail: `All ${trades.length} trades opened and closed within the same UTC calendar day (average hold ${Math.round(avgHoldMin)} min) with zero weekend crossings and zero sub-30-second scalps.`,
      evidenceBasis: "confirmed",
    });
  }

  const metrics: TradeMetrics = {
    tradeCount: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    netProfit,
    winRate: wins.length / trades.length,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    outlierLossRatio,
    profitFactor,
    expectancy: netProfit / trades.length,
    averageRewardRisk,
    averageRealizedR: realizedR,
    tradesWithRiskAmount: riskTrades.length,
    riskConsistencyCv,
    averageTradesPerActiveWeek: byWeek.size ? trades.length / byWeek.size : null,
    averageTradesPerActiveDay: daily.size ? trades.length / daily.size : null,
    averageHoldingMinutes: avgHoldMin,
    medianHoldingMinutes,
    minHoldingMinutes,
    maxHoldingMinutes,
    shortHoldTradesCount,
    overnightTradesCount,
    weekendTradesCount,
    maximumBalanceDrawdown: maxBalanceDd,
    maximumSampledEquityDrawdown: equityDrawdown,
    largestRealizedDailyLoss: largestDailyLoss,
    maxWinningStreak,
    maxLosingStreak,
    bestDayProfitShare,
    topThreeTradesProfitShare,
    instruments: [...byInstrument]
      .map(([symbol, values]) => ({
        symbol,
        trades: values.trades,
        netProfit: values.netProfit,
        winRate: values.wins / values.trades,
      }))
      .sort((a, b) => b.trades - a.trades || a.symbol.localeCompare(b.symbol)),
    daysOfWeek: [...byDayName]
      .map(([day, values]) => ({ day, ...values }))
      .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)),
    sessions,
    directionPerformance: [...byDirection].map(([side, values]) => ({
      side,
      trades: values.trades,
      netProfit: values.netProfit,
      winRate: values.wins / values.trades,
    })),
    dailyResults,
    performanceHalfComparison,
    behavioralFindings,
    limitations,
  };
  return { trades, metrics, warnings };
}

export function buildHistorySummary(analysis: TradeAnalysis, startingBalance: number): TradeHistorySummary {
  const { metrics } = analysis;
  return {
    tradeCount: metrics.tradeCount,
    averageHoldingMinutes: metrics.averageHoldingMinutes,
    averageTradesPerActiveWeek: metrics.averageTradesPerActiveWeek,
    maxLosingStreak: metrics.maxLosingStreak,
    largestRealizedDailyLossPct: startingBalance > 0 ? (metrics.largestRealizedDailyLoss / startingBalance) * 100 : null,
    maximumBalanceDrawdownPct: startingBalance > 0 ? (metrics.maximumBalanceDrawdown / startingBalance) * 100 : null,
    profitFactor: metrics.profitFactor,
    expectancy: metrics.expectancy,
    bestDayProfitShare: metrics.bestDayProfitShare,
    startingBalance,
    outcomes: { wins: metrics.wins, losses: metrics.losses, breakeven: metrics.breakeven },
    maximumBalanceDrawdown: metrics.maximumBalanceDrawdown,
    netProfit: metrics.netProfit,
    winRate: metrics.winRate,
    averageWin: metrics.averageWin,
    averageLoss: metrics.averageLoss,
    largestLoss: metrics.largestLoss,
    outlierLossRatio: metrics.outlierLossRatio,
    averageRewardRisk: metrics.averageRewardRisk,
    averageRealizedR: metrics.averageRealizedR,
    maxWinningStreak: metrics.maxWinningStreak,
    topThreeTradesProfitShare: metrics.topThreeTradesProfitShare,
    shortHoldTradesCount: metrics.shortHoldTradesCount,
    overnightTradesCount: metrics.overnightTradesCount,
    weekendTradesCount: metrics.weekendTradesCount,
    maximumSampledEquityDrawdownPct:
      startingBalance > 0 && metrics.maximumSampledEquityDrawdown !== null
        ? (metrics.maximumSampledEquityDrawdown / startingBalance) * 100
        : null,
    riskConsistencyCv: metrics.riskConsistencyCv,
    topInstruments: metrics.instruments.slice(0, 5).map(({ symbol, trades, netProfit }) => ({ symbol, trades, netProfit })),
    sessions: metrics.sessions,
    behavioralFindings: metrics.behavioralFindings,
    limitations: metrics.limitations,
  };
}
