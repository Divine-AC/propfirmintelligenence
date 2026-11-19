import { describe, expect, it } from "vitest";
import { analyzeTradeCsv, previewTradeCsv, TradeCsvError } from "../src/lib/trading-history/csv";
import { SAMPLE_TRADES_CSV } from "../src/data/sample-trades";
import { buildHistorySummary } from "../src/lib/trading-history/analytics";

const csv = [
  "symbol,type,open_time,close_time,profit,commission,swap,risk_amount",
  "EURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,100,-2,0,50",
  "GBPUSD,sell,2026-01-01T11:00:00Z,2026-01-01T11:30:00Z,-50,-1,0,25",
  '"XAU,USD",long,2026-01-03T09:00:00+00:00,2026-01-03T10:00:00+00:00,50,0,0,25',
].join("\n");

describe("trade history CSV analysis", () => {
  it("can preview and analyze the bundled demo without remapping columns", () => {
    const preview = previewTradeCsv(SAMPLE_TRADES_CSV);
    expect(preview.validRows).toBe(12);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.unmappedHeaders).toEqual([]);
    expect(analyzeTradeCsv(SAMPLE_TRADES_CSV, 25_000).metrics.tradeCount).toBe(12);
  });

  it("calculates reproducible closed-trade metrics and net costs", () => {
    const { trades, metrics } = analyzeTradeCsv(csv, 1_000);
    expect(trades).toHaveLength(3);
    expect(metrics.netProfit).toBe(97);
    expect(metrics.winRate).toBeCloseTo(2 / 3);
    expect(metrics.averageWin).toBe(74);
    expect(metrics.averageLoss).toBe(-51);
    expect(metrics.profitFactor).toBeCloseTo(148 / 51);
    expect(metrics.expectancy).toBeCloseTo(97 / 3);
    expect(metrics.averageRewardRisk).toBeCloseTo(74 / 51);
    expect(metrics.averageRealizedR).toBeCloseTo((98 / 50 + -51 / 25 + 50 / 25) / 3);
    expect(metrics.averageTradesPerActiveDay).toBe(1.5);
    expect(metrics.averageTradesPerActiveWeek).toBe(3);
    expect(metrics.maxWinningStreak).toBe(1);
    expect(metrics.maxLosingStreak).toBe(1);
    expect(metrics.maximumBalanceDrawdown).toBe(51);
    expect(metrics.maximumSampledEquityDrawdown).toBeNull();
    expect(metrics.largestRealizedDailyLoss).toBe(0);
    expect(metrics.instruments[0]).toMatchObject({ symbol: "EURUSD", trades: 1, netProfit: 98 });
    expect(metrics.limitations[0]).toMatch(/intratrade/);
  });

  it("keeps outcome counts and amount drawdown in the saved statistics, not the underlying series", () => {
    const withFlatTrade = `${csv}\nEURUSD,buy,2026-01-04T09:00:00Z,2026-01-04T10:00:00Z,2,-2,0,50`;
    const summary = buildHistorySummary(analyzeTradeCsv(withFlatTrade, 0), 0);
    expect(summary.outcomes).toEqual({ wins: 2, losses: 1, breakeven: 1 });
    expect(summary.winRate).toBe(0.5);
    expect(summary.netProfit).toBe(97);
    expect(summary.maximumBalanceDrawdown).toBe(51);
    expect(summary.maximumBalanceDrawdownPct).toBeNull();
    expect(summary).not.toHaveProperty("trades");
    expect(summary).not.toHaveProperty("dailyResults");
  });

  it("requires stable timezone-aware timestamps", () => {
    const preview = previewTradeCsv("symbol,side,open_time,close_time,profit\nEURUSD,buy,2026-01-01 09:00,2026-01-01 10:00,1");
    expect(preview.invalidRows[0].errors.join(" ")).toMatch(/timezone/);
  });

  it("rejects missing columns, malformed rows, invalid amounts, and reversed times", () => {
    expect(previewTradeCsv("symbol,profit\nEURUSD,3").invalidRows[0].errors.join(" ")).toMatch(/Map a CSV column to side/);
    expect(previewTradeCsv("symbol,side,open_time,close_time,profit\nEURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,NaN").invalidRows[0].errors.join(" "))
      .toMatch(/Profit must be a valid number/);
    expect(previewTradeCsv("symbol,side,open_time,close_time,profit\nEURUSD,buy,2026-01-01T10:00:00Z,2026-01-01T09:00:00Z,1").invalidRows[0].errors.join(" "))
      .toMatch(/cannot be before/);
    expect(() => analyzeTradeCsv('symbol,side,open_time,close_time,profit\nEURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,"1'))
      .toThrow(TradeCsvError);
  });

  it("does not invent ratios when the export lacks enough data", () => {
    const { metrics } = analyzeTradeCsv("symbol,side,open_time,close_time,profit\nEURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,5");
    expect(metrics.averageRewardRisk).toBeNull();
    expect(metrics.averageRealizedR).toBeNull();
    expect(metrics.bestDayProfitShare).toBe(1);
  });

  it("suggests mappings for common broker headers and reports extras", () => {
    const preview = previewTradeCsv("Instrument,Direction,Entry Time,Exit Time,Net Profit,Ticket,Unused\nEURUSD,BUY,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,15,abc,yes");
    expect(preview.validRows).toBe(1);
    expect(preview.mapping).toMatchObject({ symbol: 0, side: 1, openTime: 2, closeTime: 3, profit: 4, tradeId: 5 });
    expect(preview.unmappedHeaders).toEqual(["Unused"]);
  });

  it("lets users map columns manually and excludes invalid and duplicate rows transparently", () => {
    const manualMap = { symbol: 2, side: 0, openTime: 3, closeTime: 4, profit: 1 } as const;
    const preview = previewTradeCsv("type,pnl,pair,opened,closed\nBUY,5,EURUSD,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z\nBUY,5,EURUSD,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z\nSELL,oops,GBPUSD,2026-01-02T09:00:00Z,2026-01-02T10:00:00Z", manualMap);
    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(1);
    expect(preview.duplicateRows).toEqual([3]);
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.invalidRows[0].errors.join(" ")).toMatch(/valid number/);
  });

  it("does not double-subtract fees from a net-profit column", () => {
    const preview = previewTradeCsv("symbol,side,open_time,close_time,net_profit,commission\nEURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,10,-2");
    expect(preview.trades[0].netProfit).toBe(10);
    expect(preview.warnings.join(" ")).toMatch(/net of costs/);
  });

  it("reports sampled balance and equity drawdown only when exports provide them", () => {
    const { metrics } = analyzeTradeCsv("symbol,side,open_time,close_time,profit,balance,equity\nEURUSD,buy,2026-01-01T09:00:00Z,2026-01-01T10:00:00Z,-20,980,970\nEURUSD,buy,2026-01-02T09:00:00Z,2026-01-02T10:00:00Z,30,1010,1000", 1_000);
    expect(metrics.maximumBalanceDrawdown).toBe(20);
    expect(metrics.maximumSampledEquityDrawdown).toBe(30);
    expect(metrics.limitations[0]).toMatch(/balance values/);
  });

  it("extracts session breakdowns, overnight/weekend crossings, sub-30s scalps, and behavioral findings", () => {
    const sample = [
      "symbol,side,open_time,close_time,profit,risk_amount",
      "EURUSD,buy,2026-10-02T08:00:00Z,2026-10-02T08:00:20Z,120,50",
      "GBPUSD,sell,2026-10-02T14:00:00Z,2026-10-05T09:00:00Z,400,50",
      "XAUUSD,buy,2026-10-06T17:00:00Z,2026-10-06T18:30:00Z,-80,50",
      "USDJPY,sell,2026-10-07T02:00:00Z,2026-10-07T04:00:00Z,60,50",
    ].join("\n");
    const analysis = analyzeTradeCsv(sample, 10_000);
    expect(analysis.metrics.shortHoldTradesCount).toBe(1);
    expect(analysis.metrics.overnightTradesCount).toBe(1);
    expect(analysis.metrics.weekendTradesCount).toBe(1);
    expect(analysis.metrics.sessions.length).toBe(4);
    expect(analysis.metrics.performanceHalfComparison).not.toBeNull();
    expect(analysis.metrics.behavioralFindings.length).toBeGreaterThan(0);

    const summary = buildHistorySummary(analysis, 10_000);
    expect(summary.weekendTradesCount).toBe(1);
    expect(summary.shortHoldTradesCount).toBe(1);
    expect(summary.sessions?.length).toBe(4);
  });
});
