"use client";

import Link from "next/link";
import { useState } from "react";
import { analyzeTrades, buildHistorySummary } from "@/lib/trading-history/analytics";
import { analyzeTradePreview, MAX_CSV_BYTES, previewTradeCsv, TradeCsvError } from "@/lib/trading-history/csv";
import type {
  ClosedTrade,
  CsvPreview,
  TradeAnalysis,
  TradeColumnMap,
  TradeField,
} from "@/lib/trading-history/types";

const fields: Array<{ id: TradeField; label: string; required?: boolean }> = [
  { id: "symbol", label: "Instrument", required: true },
  { id: "side", label: "Buy / sell", required: true },
  { id: "openTime", label: "Entry time", required: true },
  { id: "closeTime", label: "Exit time", required: true },
  { id: "profit", label: "Profit / loss", required: true },
  { id: "commission", label: "Commission" },
  { id: "swap", label: "Swap / financing" },
  { id: "riskAmount", label: "Planned risk" },
  { id: "tradeId", label: "Trade ID" },
  { id: "balance", label: "Balance after trade" },
  { id: "equity", label: "Equity after trade" },
];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400";
const numberText = (value: number | null) =>
  value === null ? "Insufficient data" : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const percentText = (value: number | null) =>
  value === null ? "Insufficient data" : `${(value * 100).toFixed(1)}%`;

function MetricCard({
  label,
  value,
  note,
  accent = "default",
}: {
  label: string;
  value: string;
  note?: string;
  accent?: "default" | "positive" | "caution" | "cyan";
}) {
  const borderClass =
    accent === "positive"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : accent === "caution"
      ? "border-amber-500/30 bg-amber-500/5"
      : accent === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/5"
      : "border-slate-800 bg-slate-900/60";
  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-white tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>}
    </div>
  );
}

function CumulativeProfitChart({ points }: { points: TradeAnalysis["metrics"]["dailyResults"] }) {
  const width = 840;
  const height = 260;
  const left = 64;
  const right = 22;
  const top = 22;
  const bottom = 34;
  const series = [{ date: "Start", cumulativeProfit: 0 }, ...points];
  const values = series.map((point) => point.cumulativeProfit);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const spread = max - min || 1;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const coordinates = series.map((point, index) => ({
    x: left + (series.length === 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth),
    y: top + ((max - point.cumulativeProfit) / spread) * plotHeight,
    point,
  }));
  const line = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const zeroY = top + ((max - 0) / spread) * plotHeight;
  const area = `${line} L${coordinates[coordinates.length - 1].x},${zeroY} L${coordinates[0].x},${zeroY} Z`;
  const last = points[points.length - 1];

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Realized Trajectory</p>
          <h3 className="mt-0.5 text-lg font-semibold text-white">Cumulative realized profit and loss</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Daily closed-trade results accumulated in UTC, in the CSV export currency. This is a closed-balance curve
            and excludes intratrade floating excursions between closes.
          </p>
        </div>
        {last && (
          <p
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums ${
              last.cumulativeProfit >= 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            Sample total: {last.cumulativeProfit >= 0 ? "+" : ""}
            {numberText(last.cumulativeProfit)}
          </p>
        )}
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          role="img"
          aria-label="Line chart of cumulative realized profit and loss over the imported trade history"
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto min-w-[580px] w-full"
        >
          <defs>
            <linearGradient id="pnlArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke="#475569" strokeDasharray="4 5" />
          <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#334155" />
          <path d={area} fill="url(#pnlArea)" />
          <path d={line} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.slice(1).map(({ x, y, point }, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill={point.cumulativeProfit >= 0 ? "#67e8f9" : "#fda4af"}
              stroke="#020617"
              strokeWidth="1.5"
            >
              <title>
                {point.date}: {numberText(point.cumulativeProfit)} cumulative
              </title>
            </circle>
          ))}
          <text x={left - 10} y={top + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-mono">
            {numberText(max)}
          </text>
          <text x={left - 10} y={zeroY + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
            0
          </text>
          <text x={left - 10} y={height - bottom + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-mono">
            {numberText(min)}
          </text>
          <text x={left} y={height - 8} className="fill-slate-400 text-[11px] font-mono">
            {points[0]?.date ?? "Start"}
          </text>
          <text x={width - right} y={height - 8} textAnchor="end" className="fill-slate-400 text-[11px] font-mono">
            {last?.date ?? "End"}
          </text>
        </svg>
      </div>
    </section>
  );
}

const SAMPLE_CSV = `symbol,side,openTime,closeTime,profit,commission,swap,risk_amount
EURUSD,buy,2026-10-01T08:15:00Z,2026-10-01T10:40:00Z,320,-7,-1.5,100
GBPUSD,sell,2026-10-01T13:20:00Z,2026-10-01T15:05:00Z,-180,-7,0,100
XAUUSD,buy,2026-10-02T09:00:00Z,2026-10-02T12:30:00Z,540,-10,-2,150
EURUSD,sell,2026-10-05T07:45:00Z,2026-10-05T09:10:00Z,210,-7,0,100
USDJPY,buy,2026-10-06T14:10:00Z,2026-10-06T16:50:00Z,-140,-7,-1,100
GBPUSD,sell,2026-10-06T17:10:00Z,2026-10-06T18:35:00Z,-110,-7,0,100
GBPUSD,buy,2026-10-07T08:30:00Z,2026-10-07T11:15:00Z,410,-7,0,125
XAUUSD,sell,2026-10-08T12:00:00Z,2026-10-08T14:45:00Z,290,-10,0,125
EURUSD,buy,2026-10-09T09:20:00Z,2026-10-09T10:55:00Z,-120,-7,0,100
EURUSD,buy,2026-10-12T08:05:00Z,2026-10-12T11:20:00Z,265,-7,0,100
USDJPY,sell,2026-10-13T13:15:00Z,2026-10-13T15:40:00Z,195,-7,0,100
XAUUSD,buy,2026-10-14T12:30:00Z,2026-10-14T14:10:00Z,-155,-10,0,125`;

const BALANCE_PRESETS = [10000, 25000, 50000, 100000, 200000];

type ManualTradeRow = {
  id: string;
  symbol: string;
  side: "long" | "short";
  openTime: string;
  closeTime: string;
  netProfit: string;
  riskAmount: string;
};

const INITIAL_MANUAL_ROWS: ManualTradeRow[] = [
  {
    id: "m1",
    symbol: "EURUSD",
    side: "long",
    openTime: "2026-10-05T08:30:00Z",
    closeTime: "2026-10-05T11:15:00Z",
    netProfit: "240",
    riskAmount: "100",
  },
  {
    id: "m2",
    symbol: "GBPUSD",
    side: "short",
    openTime: "2026-10-06T13:00:00Z",
    closeTime: "2026-10-06T15:20:00Z",
    netProfit: "-105",
    riskAmount: "100",
  },
  {
    id: "m3",
    symbol: "XAUUSD",
    side: "long",
    openTime: "2026-10-07T09:15:00Z",
    closeTime: "2026-10-07T12:45:00Z",
    netProfit: "380",
    riskAmount: "120",
  },
  {
    id: "m4",
    symbol: "EURUSD",
    side: "short",
    openTime: "2026-10-08T08:00:00Z",
    closeTime: "2026-10-08T10:30:00Z",
    netProfit: "190",
    riskAmount: "100",
  },
];

export default function HistoryPage() {
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv");
  const [rawCsv, setRawCsv] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState<TradeColumnMap>({});
  const [manualRows, setManualRows] = useState<ManualTradeRow[]>(INITIAL_MANUAL_ROWS);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [startingBalance, setStartingBalance] = useState("10000");
  const [isDragging, setIsDragging] = useState(false);

  function saveSummaryToBrowser(report: TradeAnalysis, balance: number) {
    try {
      const summary = buildHistorySummary(report, balance);
      localStorage.setItem("propfirm-history-summary", JSON.stringify(summary));
      window.dispatchEvent(new Event("propfirm-history-summary-change"));
    } catch {
      /* Search remains available when browser storage is disabled. */
    }
  }

  function previewWith(csv: string, nextMapping?: TradeColumnMap) {
    try {
      const next = previewTradeCsv(csv, nextMapping);
      setPreview(next);
      setMapping(next.mapping);
      setError("");
      setAnalysis(null);
    } catch (cause) {
      setPreview(null);
      setAnalysis(null);
      setError(
        cause instanceof TradeCsvError ? cause.message : "The CSV could not be read. Check the file and try again."
      );
    }
  }

  async function importFile(file?: File) {
    setError("");
    setPreview(null);
    setAnalysis(null);
    setFileName("");
    setRawCsv("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Choose a CSV file. No other file types are accepted.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("This file is larger than the 5 MB limit.");
      return;
    }
    const csv = await file.text();
    setRawCsv(csv);
    setFileName(file.name);
    previewWith(csv);
  }

  function changeMapping(field: TradeField, value: string) {
    const next = { ...mapping };
    if (value === "") delete next[field];
    else next[field] = Number(value);
    setMapping(next);
    if (rawCsv) previewWith(rawCsv, next);
  }

  function analyze() {
    try {
      const balance = Number(startingBalance);
      if (!Number.isFinite(balance) || balance < 0) {
        throw new TradeCsvError("Starting balance must be a non-negative number.");
      }
      if (!preview) throw new TradeCsvError("Choose a CSV file first.");
      const report = analyzeTradePreview(preview, balance);
      setAnalysis(report);
      setError("");
      saveSummaryToBrowser(report, balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The trade data could not be analyzed.");
    }
  }

  function analyzeManualTrades() {
    try {
      const balance = Number(startingBalance);
      if (!Number.isFinite(balance) || balance < 0) {
        throw new TradeCsvError("Starting balance must be a non-negative number.");
      }
      if (manualRows.length === 0) {
        throw new TradeCsvError("Add at least one trade row before analyzing.");
      }
      const parsedTrades: ClosedTrade[] = manualRows.map((row, idx) => {
        const symbol = row.symbol.trim().toUpperCase();
        if (!symbol) throw new TradeCsvError(`Row ${idx + 1}: Instrument symbol is required.`);
        const openStamp = Date.parse(row.openTime);
        const closeStamp = Date.parse(row.closeTime);
        if (!Number.isFinite(openStamp) || !Number.isFinite(closeStamp)) {
          throw new TradeCsvError(`Row ${idx + 1}: Valid ISO entry and exit times are required.`);
        }
        if (closeStamp < openStamp) {
          throw new TradeCsvError(`Row ${idx + 1}: Close time cannot be before open time.`);
        }
        const netProfit = Number(row.netProfit);
        if (!Number.isFinite(netProfit)) {
          throw new TradeCsvError(`Row ${idx + 1}: Net profit must be a valid number.`);
        }
        const riskVal = row.riskAmount.trim() === "" ? null : Number(row.riskAmount);
        if (riskVal !== null && (!Number.isFinite(riskVal) || riskVal <= 0)) {
          throw new TradeCsvError(`Row ${idx + 1}: Planned risk must be greater than zero when provided.`);
        }
        return {
          rowNumber: idx + 1,
          tradeId: `manual-${idx + 1}`,
          symbol,
          side: row.side,
          openTime: new Date(openStamp).toISOString(),
          closeTime: new Date(closeStamp).toISOString(),
          netProfit,
          riskAmount: riskVal,
          observedBalance: null,
          observedEquity: null,
        };
      });
      const report = analyzeTrades(parsedTrades, balance);
      setAnalysis(report);
      setError("");
      saveSummaryToBrowser(report, balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manual trades could not be analyzed.");
    }
  }

  function loadSampleCsv() {
    setInputMode("csv");
    setError("");
    setRawCsv(SAMPLE_CSV);
    setFileName("sample-trades.csv");
    previewWith(SAMPLE_CSV);
  }

  function clear() {
    setRawCsv("");
    setPreview(null);
    setAnalysis(null);
    setMapping({});
    setFileName("");
    setError("");
    try {
      localStorage.removeItem("propfirm-history-summary");
      window.dispatchEvent(new Event("propfirm-history-summary-change"));
    } catch {
      /* Local report can still be cleared in memory. */
    }
  }

  function addManualRow() {
    setManualRows((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}-${prev.length}`,
        symbol: "EURUSD",
        side: "long",
        openTime: "2026-10-09T09:00:00Z",
        closeTime: "2026-10-09T11:30:00Z",
        netProfit: "150",
        riskAmount: "100",
      },
    ]);
  }

  function updateManualRow(id: string, key: keyof ManualTradeRow, value: string) {
    setManualRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function removeManualRow(id: string) {
    setManualRows((prev) => prev.filter((row) => row.id !== id));
  }

  const numericBalance = Number(startingBalance) > 0 ? Number(startingBalance) : 0;

  return (
    <main className="min-h-screen px-4 py-9 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Empirical Trading-History Diagnostics
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              See what your closed trades actually reveal.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Import a closed-trade CSV or enter demo trades manually. Calculate win rate, profit factor, session
              performance, single-day profit concentration, losing-streak compounding, and drawdown—with confirmed
              findings strictly separated from estimates.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setInputMode("csv")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                inputMode === "csv"
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              CSV File Import
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                inputMode === "manual"
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Manual Trade Entry
            </button>
          </div>
        </header>

        {/* Top Input & Privacy Section */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          {inputMode === "csv" ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void importFile(file);
              }}
              className={`rounded-2xl border p-6 transition ${
                isDragging ? "border-cyan-400 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-white">Import your trade history</h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Processed locally in browser
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Drag and drop a UTF-8 CSV here, choose a file from your device, or load our 12-trade multi-session
                sample export. Confirm column mappings below before running diagnostics.
              </p>

              <div className="mt-5 rounded-xl border border-slate-800/90 bg-slate-950/60 p-4">
                <label className="block text-sm font-medium text-slate-200">
                  Starting balance
                  <input
                    aria-label="Starting balance"
                    inputMode="decimal"
                    className={`${fieldClass} block sm:w-60 tabular-nums`}
                    value={startingBalance}
                    onChange={(event) => setStartingBalance(event.target.value)}
                  />
                </label>
                <p className="mt-1.5 text-xs text-slate-400">
                  Used to express realized daily losses and balance drawdown as a percentage of account equity.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {BALANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStartingBalance(String(preset))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition tabular-nums ${
                        startingBalance === String(preset)
                          ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      ${(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-cyan-300">
                  Choose CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => void importFile(event.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  Load sample CSV
                </button>
                {(preview || analysis) && (
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    onClick={clear}
                  >
                    Clear analysis
                  </button>
                )}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                CSV only · up to 5 MB and 10,000 trades · timestamps must be ISO date/time with an explicit timezone
                (e.g. 2026-10-01T08:15:00Z)
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
                >
                  {error}
                </p>
              )}
              {preview && (
                <p role="status" className="mt-5 text-sm font-medium text-emerald-300">
                  Previewing {fileName}: {preview.validRows} valid, {preview.invalidRows.length} invalid,{" "}
                  {preview.duplicateRows.length} duplicate of {preview.totalRows} rows.
                </p>
              )}
            </div>
          ) : (
            /* Manual Trade Entry Builder */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-white">Manual Trade Log Entry</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Enter closed demo or live trades directly if you do not have a CSV export handy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addManualRow}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  + Add Trade Row
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium text-slate-300">
                  Starting balance ($)
                  <input
                    inputMode="decimal"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    className="ml-2 w-32 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                </label>
                {BALANCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStartingBalance(String(preset))}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                      startingBalance === String(preset)
                        ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    ${preset / 1000}k
                  </button>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-2.5">Symbol</th>
                      <th className="p-2.5">Side</th>
                      <th className="p-2.5">Entry (ISO UTC)</th>
                      <th className="p-2.5">Exit (ISO UTC)</th>
                      <th className="p-2.5">Net P&amp;L</th>
                      <th className="p-2.5">Risk ($)</th>
                      <th className="p-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {manualRows.map((row) => (
                      <tr key={row.id}>
                        <td className="p-2">
                          <input
                            value={row.symbol}
                            onChange={(e) => updateManualRow(row.id, "symbol", e.target.value)}
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.side}
                            onChange={(e) => updateManualRow(row.id, "side", e.target.value as "long" | "short")}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
                          >
                            <option value="long">Long</option>
                            <option value="short">Short</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            value={row.openTime}
                            onChange={(e) => updateManualRow(row.id, "openTime", e.target.value)}
                            className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.closeTime}
                            onChange={(e) => updateManualRow(row.id, "closeTime", e.target.value)}
                            className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.netProfit}
                            onChange={(e) => updateManualRow(row.id, "netProfit", e.target.value)}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.riskAmount}
                            onChange={(e) => updateManualRow(row.id, "riskAmount", e.target.value)}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white tabular-nums"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeManualRow(row.id)}
                            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3.5 text-sm text-rose-200"
                >
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={analyzeManualTrades}
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Analyze {manualRows.length} Manual Trade(s)
                </button>
                {analysis && (
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Clear analysis
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Epistemic Boundaries & Privacy Aside */}
          <aside className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Analytical Methodology &amp; Privacy
              </p>
              <h2 className="mt-1.5 text-lg font-semibold text-white">Data stays local to this tab</h2>
              <p className="mt-2.5 text-sm leading-6 text-slate-400">
                Nothing is uploaded to a remote server. When you link your analysis to the advisory consultation, only
                derived aggregate statistics (trade count, streaks, daily loss %, profit factor, best-day share, and
                session performance) are retained in browser storage.
              </p>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-5 text-slate-300">
                <p className="font-semibold text-white">Confirmed vs. Estimated Drawdown</p>
                <p className="mt-1 text-slate-400">
                  Balance drawdown can be estimated from closed trades. Equity drawdown requires exported equity
                  snapshots and still cannot reveal maximum intratrade floating drawdown between rows.
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-800 pt-4">
              <Link
                href="/matches"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline"
              >
                Skip to Strategy Consultation without CSV →
              </Link>
            </div>
          </aside>
        </section>

        {/* CSV Column Mapping & Preview Section */}
        {inputMode === "csv" && preview && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Column Verification</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Check detected columns</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Required columns are marked with *. Leave unavailable optional fields unmapped.
                </p>
              </div>
              <button
                onClick={analyze}
                disabled={preview.validRows === 0}
                className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyze {preview.validRows} valid trades
              </button>
            </div>

            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <label key={field.id} className="text-xs font-medium text-slate-300">
                  {field.label}
                  {field.required ? " *" : ""}
                  <select
                    aria-label={field.label}
                    className={fieldClass}
                    value={mapping[field.id] === undefined ? "" : String(mapping[field.id])}
                    onChange={(event) => changeMapping(field.id, event.target.value)}
                  >
                    <option value="">Not mapped</option>
                    {preview.headers.map((header, index) => (
                      <option key={`${index}-${header}`} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {preview.unmappedHeaders.length > 0 && (
              <p className="mt-4 text-xs text-slate-400">Unmapped columns: {preview.unmappedHeaders.join(", ")}</p>
            )}
            {preview.warnings.map((warning) => (
              <p key={warning} className="mt-3 text-xs text-amber-200">
                • {warning}
              </p>
            ))}

            {(preview.invalidRows.length > 0 || preview.duplicateRows.length > 0) && (
              <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <h3 className="font-semibold text-amber-200">Rows that will be excluded</h3>
                <p className="mt-1 text-sm text-slate-300">
                  You can analyze the valid, unique rows, but check the excluded lines first.
                </p>
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-300">
                  {preview.invalidRows.slice(0, 20).map((item) => (
                    <li key={item.rowNumber}>
                      Row {item.rowNumber}: {item.errors.join(" ")}
                    </li>
                  ))}
                  {preview.duplicateRows.slice(0, 20).map((row) => (
                    <li key={`dup-${row}`}>Row {row}: duplicate trade.</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.trades.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Instrument</th>
                      <th className="p-3">Side</th>
                      <th className="p-3">Entry (UTC)</th>
                      <th className="p-3">Exit (UTC)</th>
                      <th className="p-3">Net profit</th>
                      <th className="p-3">Planned risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {preview.trades.slice(0, 6).map((trade) => (
                      <tr key={trade.rowNumber} className="text-slate-200">
                        <td className="p-3 font-medium">{trade.symbol}</td>
                        <td className="p-3 capitalize">{trade.side}</td>
                        <td className="p-3 font-mono text-xs">{trade.openTime.replace("T", " ").slice(0, 16)}</td>
                        <td className="p-3 font-mono text-xs">{trade.closeTime.replace("T", " ").slice(0, 16)}</td>
                        <td
                          className={`p-3 font-semibold tabular-nums ${
                            trade.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {trade.netProfit >= 0 ? "+" : ""}
                          {numberText(trade.netProfit)}
                        </td>
                        <td className="p-3 text-slate-400 tabular-nums">
                          {trade.riskAmount !== null ? numberText(trade.riskAmount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="p-3 text-xs text-slate-500">Showing up to 6 of {preview.validRows} valid rows.</p>
              </div>
            )}
          </section>
        )}

        {/* Full Analytical Report */}
        {analysis && (
          <section className="mt-10 space-y-8" aria-live="polite">
            {/* Banner to connect with Advisory Consultation */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Historical sample report · Ready for Prop-Firm Matching
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {analysis.metrics.tradeCount} Closed Trades Analyzed
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-200">
                  Derived behavioral metrics (streaks, daily loss peak, profit concentration, and holding cadence) are
                  saved in this browser tab. Launch the consultation to stress-test these metrics against 27 prop-firm
                  accounts.
                </p>
              </div>
              <a
                href="/matches?historySearch=1"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-300"
              >
                <span>Search prop firms using this history</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>

            {/* Behavioral Findings in Plain, Sophisticated Trading Language */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Specialist Behavioral Assessment
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">What your trading data actually reveals</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {analysis.metrics.behavioralFindings.map((finding) => {
                  const badgeStyle =
                    finding.severity === "positive"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : finding.severity === "warning"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : finding.severity === "caution"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
                  return (
                    <article
                      key={finding.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}>
                          {finding.category.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Basis: {finding.evidenceBasis === "confirmed" ? "Confirmed in export" : "Estimated from closes"}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-semibold text-white">{finding.title}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-slate-300">{finding.detail}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">Core Performance, Drawdown &amp; Concentration Metrics</h3>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Trades"
                  value={analysis.metrics.tradeCount.toLocaleString()}
                  note={`${analysis.metrics.wins} wins · ${analysis.metrics.losses} losses · ${analysis.metrics.breakeven} break-even`}
                />
                <MetricCard
                  label="Net profit"
                  value={numberText(analysis.metrics.netProfit)}
                  note="Export currency; fees applied when mapped."
                  accent={analysis.metrics.netProfit > 0 ? "positive" : "caution"}
                />
                <MetricCard label="Win rate" value={percentText(analysis.metrics.winRate)} />
                <MetricCard
                  label="Profit factor"
                  value={numberText(analysis.metrics.profitFactor)}
                  note="Gross wins divided by gross losses."
                  accent={
                    analysis.metrics.profitFactor !== null && analysis.metrics.profitFactor >= 1.4
                      ? "positive"
                      : "default"
                  }
                />
                <MetricCard label="Expectancy per trade" value={numberText(analysis.metrics.expectancy)} />
                <MetricCard
                  label="Average win / loss"
                  value={
                    analysis.metrics.averageRewardRisk === null
                      ? "Insufficient data"
                      : `${analysis.metrics.averageRewardRisk.toFixed(2)} : 1`
                  }
                  note={`Avg win: ${numberText(analysis.metrics.averageWin)} · Avg loss: ${numberText(analysis.metrics.averageLoss)}`}
                />
                <MetricCard
                  label="Realized R-multiple"
                  value={
                    analysis.metrics.averageRealizedR === null
                      ? "Insufficient data"
                      : `${analysis.metrics.averageRealizedR.toFixed(2)}R`
                  }
                  note={`Covers ${analysis.metrics.tradesWithRiskAmount} of ${analysis.metrics.tradeCount} trades with risk.`}
                />
                <MetricCard
                  label="Outlier loss ratio"
                  value={
                    analysis.metrics.outlierLossRatio === null
                      ? "Insufficient data"
                      : `${analysis.metrics.outlierLossRatio.toFixed(2)}× avg loss`
                  }
                  note={`Largest single loss: ${numberText(analysis.metrics.largestLoss)}`}
                />
                <MetricCard
                  label="Trades per active week"
                  value={numberText(analysis.metrics.averageTradesPerActiveWeek)}
                  note={`Avg ${numberText(analysis.metrics.averageTradesPerActiveDay)} per active trading day`}
                />
                <MetricCard
                  label="Average holding"
                  value={`${analysis.metrics.averageHoldingMinutes.toFixed(0)} min`}
                  note={`Median ${analysis.metrics.medianHoldingMinutes.toFixed(0)} min · ${analysis.metrics.overnightTradesCount} overnight · ${analysis.metrics.weekendTradesCount} weekend`}
                />
                <MetricCard
                  label={
                    analysis.trades.every((trade) => trade.observedBalance !== null)
                      ? "Balance drawdown (sampled)"
                      : "Balance drawdown (estimate)"
                  }
                  value={numberText(analysis.metrics.maximumBalanceDrawdown)}
                  note={
                    numericBalance > 0
                      ? `${((analysis.metrics.maximumBalanceDrawdown / numericBalance) * 100).toFixed(2)}% of starting balance`
                      : undefined
                  }
                />
                <MetricCard
                  label="Equity drawdown (sampled)"
                  value={numberText(analysis.metrics.maximumSampledEquityDrawdown)}
                  note="Exported equity snapshots only."
                />
                <MetricCard
                  label="Largest realized daily loss"
                  value={numberText(analysis.metrics.largestRealizedDailyLoss)}
                  note={
                    numericBalance > 0
                      ? `${((analysis.metrics.largestRealizedDailyLoss / numericBalance) * 100).toFixed(2)}% of starting balance`
                      : "Closed UTC day total"
                  }
                  accent={
                    numericBalance > 0 && analysis.metrics.largestRealizedDailyLoss / numericBalance >= 0.03
                      ? "caution"
                      : "default"
                  }
                />
                <MetricCard
                  label="Longest win / loss streak"
                  value={`${analysis.metrics.maxWinningStreak} / ${analysis.metrics.maxLosingStreak}`}
                  note={`${analysis.metrics.shortHoldTradesCount} trade(s) held ≤30 seconds`}
                />
                <MetricCard
                  label="Best day share of net profit"
                  value={percentText(analysis.metrics.bestDayProfitShare)}
                  note="Compare vs. 40%–50% Best Day consistency caps"
                  accent={
                    analysis.metrics.bestDayProfitShare !== null && analysis.metrics.bestDayProfitShare > 0.45
                      ? "caution"
                      : "default"
                  }
                />
                <MetricCard
                  label="Top 3 trades share of net profit"
                  value={percentText(analysis.metrics.topThreeTradesProfitShare)}
                  note="Measures outlier trade reliance"
                />
              </div>
            </div>

            {/* Cumulative P&L Chart */}
            {analysis.metrics.dailyResults.length > 0 && (
              <CumulativeProfitChart points={analysis.metrics.dailyResults} />
            )}

            {/* Daily Realized Results + Session Performance */}
            <div className="grid gap-6 lg:grid-cols-2">
              {analysis.metrics.dailyResults.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="text-base font-semibold text-white">Daily realized results · latest 14 days</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Closed P&amp;L grouped by UTC date. Prop firms may reset at 00:00 CE(S)T or server time.
                  </p>
                  <div className="mt-4 space-y-3">
                    {analysis.metrics.dailyResults.slice(-14).map((day) => {
                      const max = Math.max(
                        1,
                        ...analysis.metrics.dailyResults.map((item) => Math.abs(item.netProfit))
                      );
                      const width = Math.max(3, (Math.abs(day.netProfit) / max) * 100);
                      const pctOfBal =
                        numericBalance > 0 ? ` (${((day.netProfit / numericBalance) * 100).toFixed(2)}%)` : "";
                      return (
                        <div
                          key={day.date}
                          className="grid grid-cols-[90px_1fr_130px] items-center gap-3 text-xs tabular-nums"
                        >
                          <span className="font-mono text-slate-400">{day.date}</span>
                          <div className="h-3 rounded-full bg-slate-800">
                            <div
                              className={`h-3 rounded-full ${
                                day.netProfit >= 0 ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span
                            className={`text-right font-medium ${
                              day.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {day.netProfit >= 0 ? "+" : ""}
                            {numberText(day.netProfit)}
                            {pctOfBal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Session & Stability Breakdown */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="text-base font-semibold text-white">Performance by Trading Session (UTC Entry)</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Identifies which market sessions generate your strategy&apos;s actual realized edge.
                  </p>
                  <div className="mt-4 space-y-2.5 text-sm">
                    {analysis.metrics.sessions.map((s) => (
                      <div
                        key={s.session}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3.5 py-2.5"
                      >
                        <div>
                          <p className="font-medium text-white">{s.session}</p>
                          <p className="text-xs text-slate-400">
                            {s.trades} trade(s) · {percentText(s.winRate)} win rate
                          </p>
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${
                            s.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {s.netProfit >= 0 ? "+" : ""}
                          {numberText(s.netProfit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.metrics.performanceHalfComparison && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <h3 className="text-base font-semibold text-white">Changes in Performance Over Time</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Chronological comparison of the first half vs. second half of your submitted trade sample.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                        <p className="text-xs font-semibold uppercase text-slate-400">First Half of Sample</p>
                        <p className="mt-1.5 text-lg font-bold text-white tabular-nums">
                          {numberText(analysis.metrics.performanceHalfComparison.firstHalf.netProfit)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {analysis.metrics.performanceHalfComparison.firstHalf.trades} trades ·{" "}
                          {percentText(analysis.metrics.performanceHalfComparison.firstHalf.winRate)} win rate
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                        <p className="text-xs font-semibold uppercase text-slate-400">Second Half of Sample</p>
                        <p className="mt-1.5 text-lg font-bold text-white tabular-nums">
                          {numberText(analysis.metrics.performanceHalfComparison.secondHalf.netProfit)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {analysis.metrics.performanceHalfComparison.secondHalf.trades} trades ·{" "}
                          {percentText(analysis.metrics.performanceHalfComparison.secondHalf.winRate)} win rate
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instrument, Direction/Weekday, and Data Limitations */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="font-semibold text-white">By instrument</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                  {analysis.metrics.instruments.slice(0, 10).map((item) => (
                    <li
                      key={item.symbol}
                      className="flex items-center justify-between border-b border-slate-800/60 pb-2 tabular-nums"
                    >
                      <span>
                        <strong className="text-white">{item.symbol}</strong> · {item.trades} trade(s)
                      </span>
                      <span className={item.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {item.netProfit >= 0 ? "+" : ""}
                        {numberText(item.netProfit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="font-semibold text-white">Long / short</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {analysis.metrics.directionPerformance.map((item) => (
                    <li key={item.side} className="flex justify-between tabular-nums">
                      <span className="capitalize">
                        {item.side} · {item.trades} trades
                      </span>
                      <span>
                        {percentText(item.winRate)} wins ({item.netProfit >= 0 ? "+" : ""}
                        {numberText(item.netProfit)})
                      </span>
                    </li>
                  ))}
                </ul>
                <h3 className="mt-6 font-semibold text-white">By close weekday (UTC)</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {analysis.metrics.daysOfWeek.map((item) => (
                    <li key={item.day} className="flex justify-between tabular-nums">
                      <span>
                        {item.day} · {item.trades}
                      </span>
                      <span className={item.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {item.netProfit >= 0 ? "+" : ""}
                        {numberText(item.netProfit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-6">
                <h3 className="font-semibold text-amber-200">Limits and missing data</h3>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-300">
                  {analysis.metrics.limitations.map((limitation) => (
                    <li key={limitation}>• {limitation}</li>
                  ))}
                  {analysis.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
