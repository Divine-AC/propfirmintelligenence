"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  FlaskConical,
  Keyboard,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { storeTradeSummary, useTradeSummary } from "@/lib/storage/use-trade-summary";
import { SAMPLE_TRADES_CSV } from "@/data/sample-trades";
import { PageHeading } from "@/components/PageHeading";
import { useState } from "react";
import { analyzeTrades, buildHistorySummary } from "@/lib/trading-history/analytics";
import {
  analyzeTradePreview,
  MAX_CSV_BYTES,
  previewTradeCsv,
  TradeCsvError,
} from "@/lib/trading-history/csv";
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

const fieldClass = "field";
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
      ? "border-emerald-200 bg-emerald-50"
      : accent === "caution"
        ? "border-amber-200 bg-amber-50"
        : accent === "cyan"
          ? "border-accent-line bg-accent-tint"
          : "border-line bg-panel";
  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-muted">{note}</p>}
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
    <section className="mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Realized Trajectory</p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">Cumulative realized profit and loss</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Daily closed-trade results accumulated in UTC, in the CSV export currency. This is a
            closed-balance curve and excludes intratrade floating excursions between closes.
          </p>
        </div>
        {last && (
          <p
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums ${
              last.cumulativeProfit >= 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            Sample total: {last.cumulativeProfit >= 0 ? "+" : ""}
            {numberText(last.cumulativeProfit)}
          </p>
        )}
      </div>
      <div role="region" aria-label="Cumulative profit chart" tabIndex={0} className="mt-4 overflow-x-auto">
        <svg
          role="img"
          aria-label="Line chart of cumulative realized profit and loss over the imported trade history"
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto min-w-[580px] w-full"
        >
          <defs>
            <linearGradient id="pnlArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#237f65" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#237f65" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke="#789087" strokeDasharray="4 5" />
          <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#b5c6bf" />
          <path d={area} fill="url(#pnlArea)" />
          <path
            d={line}
            fill="none"
            stroke="#237f65"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coordinates.slice(1).map(({ x, y, point }, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill={point.cumulativeProfit >= 0 ? "#28a87b" : "#c44a68"}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <title>
                {point.date}: {numberText(point.cumulativeProfit)} cumulative
              </title>
            </circle>
          ))}
          <text x={left - 10} y={top + 4} textAnchor="end" className="fill-muted text-[11px] font-mono">
            {numberText(max)}
          </text>
          <text x={left - 10} y={zeroY + 4} textAnchor="end" className="fill-muted text-[10px] font-mono">
            0
          </text>
          <text
            x={left - 10}
            y={height - bottom + 4}
            textAnchor="end"
            className="fill-muted text-[11px] font-mono"
          >
            {numberText(min)}
          </text>
          <text x={left} y={height - 8} className="fill-muted text-[11px] font-mono">
            {points[0]?.date ?? "Start"}
          </text>
          <text
            x={width - right}
            y={height - 8}
            textAnchor="end"
            className="fill-muted text-[11px] font-mono"
          >
            {last?.date ?? "End"}
          </text>
        </svg>
      </div>
    </section>
  );
}

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
  const linkedSummary = useTradeSummary();
  const [summarySaved, setSummarySaved] = useState(false);
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

  function changeMode(mode: "csv" | "manual") {
    if (mode !== inputMode) {
      setInputMode(mode);
      setAnalysis(null);
      setError("");
    }
  }

  function saveSummaryToBrowser(report: TradeAnalysis, balance: number) {
    setSummarySaved(storeTradeSummary(buildHistorySummary(report, balance)));
  }

  function previewWith(csv: string, nextMapping?: TradeColumnMap) {
    try {
      const next = previewTradeCsv(csv, nextMapping);
      setPreview(next);
      if (!nextMapping) requestAnimationFrame(() => document.getElementById("column-review")?.focus());
      setMapping(next.mapping);
      setError("");
      setAnalysis(null);
    } catch (cause) {
      setPreview(null);
      setAnalysis(null);
      setError(
        cause instanceof TradeCsvError
          ? cause.message
          : "The CSV could not be read. Check the file and try again.",
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
    try {
      const csv = await file.text();
      setRawCsv(csv);
      setFileName(file.name);
      previewWith(csv);
    } catch {
      setError("This file could not be read. Choose it again or try another CSV.");
    }
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
      requestAnimationFrame(() => document.getElementById("analysis-results")?.focus());
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
      requestAnimationFrame(() => document.getElementById("analysis-results")?.focus());
      setError("");
      saveSummaryToBrowser(report, balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manual trades could not be analyzed.");
    }
  }

  function loadSampleCsv() {
    setInputMode("csv");
    setError("");
    setRawCsv(SAMPLE_TRADES_CSV);
    setFileName("sample-trades.csv");
    previewWith(SAMPLE_TRADES_CSV);
  }

  function clear() {
    setRawCsv("");
    setPreview(null);
    setAnalysis(null);
    setMapping({});
    setFileName("");
    setError("");
    setSummarySaved(false);
    if (!storeTradeSummary(null)) setError("The local summary could not be removed from browser storage.");
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
    <main className="shell inner-page">
      <div className="min-w-0">
        <PageHeading
          eyebrow="Module 02 / Trade diagnostics"
          title="Trade history"
          description="See what your closed trades reveal about performance, holding time, and drawdown. Import a CSV or enter your trades manually."
        >
          <div className="segmented" role="group" aria-label="Trade entry method">
            <button type="button" aria-pressed={inputMode === "csv"} onClick={() => changeMode("csv")}>
              <FileSpreadsheet size={15} />
              CSV import
            </button>
            <button type="button" aria-pressed={inputMode === "manual"} onClick={() => changeMode("manual")}>
              <Keyboard size={15} />
              Manual entry
            </button>
          </div>
        </PageHeading>

        {!analysis && !preview && linkedSummary && (
          <div className="linked-summary" role="status">
            <div>
              <strong>{linkedSummary.tradeCount} closed trades linked</strong>
              <p>Your summary is available for matching. Re-import the trades to reopen the charts.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/matches?historySearch=1" className="inline-action">
                Use for matching <ArrowRight size={14} />
              </Link>
              <button type="button" className="sample-link" onClick={clear}>
                Clear summary
              </button>
            </div>
          </div>
        )}
        {/* Top Input & Privacy Section */}
        <section className="history-layout grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.43fr)]">
          {inputMode === "csv" ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void importFile(file);
              }}
              className={`rounded-2xl border p-4 transition sm:p-6 ${
                isDragging ? "border-accent bg-accent-tint" : "border-line bg-panel"
              }`}
            >
              <p className="section-label">Trade input / CSV</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">Import your closed trades</h2>
              <label className={`upload-zone ${isDragging ? "is-dragging" : ""}`}>
                <span className="upload-icon">
                  <Upload size={23} />
                </span>
                <span>
                  <strong>Choose a CSV file</strong> or drag it here
                </span>
                <small>UTF-8 CSV · Up to 5 MB · 10,000 trades</small>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void importFile(file);
                  }}
                />
              </label>
              <div className="mt-5 rounded-xl border border-line bg-soft p-4">
                <label className="block text-sm font-medium text-ink">
                  Starting balance
                  <input
                    aria-label="Starting balance"
                    inputMode="decimal"
                    className={`${fieldClass} block sm:w-60 tabular-nums`}
                    value={startingBalance}
                    onChange={(event) => setStartingBalance(event.target.value)}
                  />
                </label>
                <p className="mt-1.5 text-xs text-muted">
                  Used to calculate daily loss and drawdown percentages.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {BALANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={startingBalance === String(preset)}
                      onClick={() => setStartingBalance(String(preset))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition tabular-nums ${
                        startingBalance === String(preset)
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-stroke text-body hover:border-accent-line"
                      }`}
                    >
                      ${(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={loadSampleCsv} className="btn btn-secondary">
                  <FlaskConical size={15} />
                  Load sample CSV
                </button>
                {(preview || analysis) && (
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-stroke px-4 py-2.5 text-sm font-medium text-body transition hover:bg-accent-tint"
                    onClick={clear}
                  >
                    Clear analysis
                  </button>
                )}
              </div>

              <p className="field-hint mt-3">No export handy? The sample contains 12 closed trades.</p>

              {error && !preview && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                >
                  {error}
                </p>
              )}
              {preview && (
                <p role="status" className="mt-5 text-sm font-medium text-emerald-800">
                  <Check size={15} className="mr-1 inline" />
                  {fileName}: {preview.validRows} valid, {preview.invalidRows.length} invalid,{" "}
                  {preview.duplicateRows.length} duplicate of {preview.totalRows} rows.
                </p>
              )}
            </div>
          ) : (
            /* Manual Trade Entry Builder */
            <div className="rounded-2xl border border-line bg-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Manual trade log</h2>
                  <p className="mt-1 text-sm text-muted">
                    Four example trades are pre-filled. Replace or remove them to analyze your own history.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addManualRow}
                  className="rounded-xl border border-accent-line bg-accent-tint px-3.5 py-2 text-xs font-semibold text-accent transition hover:bg-accent-tint"
                >
                  + Add trade
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium text-body">
                  Starting balance ($)
                  <input
                    inputMode="decimal"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    className="ml-2 w-32 rounded-lg border border-stroke bg-soft px-2.5 py-1.5 text-xs text-ink tabular-nums"
                  />
                </label>
                {BALANCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={startingBalance === String(preset)}
                    onClick={() => setStartingBalance(String(preset))}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                      startingBalance === String(preset)
                        ? "border-accent bg-accent-tint text-accent"
                        : "border-stroke text-muted"
                    }`}
                  >
                    ${preset / 1000}k
                  </button>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead className="bg-soft text-muted">
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
                  <tbody className="divide-y divide-line bg-panel">
                    {manualRows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="p-2">
                          <input
                            aria-label={`Instrument for trade ${index + 1}`}
                            value={row.symbol}
                            onChange={(e) => updateManualRow(row.id, "symbol", e.target.value)}
                            className="w-24 rounded-lg border border-stroke bg-soft px-2 py-1.5 text-ink"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            aria-label={`Side for trade ${index + 1}`}
                            value={row.side}
                            onChange={(e) =>
                              updateManualRow(row.id, "side", e.target.value as "long" | "short")
                            }
                            className="rounded-lg border border-stroke bg-soft px-2 py-1.5 text-ink"
                          >
                            <option value="long">Long</option>
                            <option value="short">Short</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Entry time for trade ${index + 1}`}
                            value={row.openTime}
                            onChange={(e) => updateManualRow(row.id, "openTime", e.target.value)}
                            className="w-44 rounded-lg border border-stroke bg-soft px-2 py-1.5 font-mono text-ink"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Exit time for trade ${index + 1}`}
                            value={row.closeTime}
                            onChange={(e) => updateManualRow(row.id, "closeTime", e.target.value)}
                            className="w-44 rounded-lg border border-stroke bg-soft px-2 py-1.5 font-mono text-ink"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Net profit for trade ${index + 1}`}
                            value={row.netProfit}
                            onChange={(e) => updateManualRow(row.id, "netProfit", e.target.value)}
                            className="w-20 rounded-lg border border-stroke bg-soft px-2 py-1.5 text-ink tabular-nums"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            aria-label={`Planned risk for trade ${index + 1}`}
                            value={row.riskAmount}
                            onChange={(e) => updateManualRow(row.id, "riskAmount", e.target.value)}
                            className="w-20 rounded-lg border border-stroke bg-soft px-2 py-1.5 text-ink tabular-nums"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            aria-label={`Remove trade ${index + 1}`}
                            onClick={() => removeManualRow(row.id)}
                            className="rounded-lg px-2 py-1 text-muted hover:bg-rose-50 hover:text-rose-800"
                          >
                            <X size={14} />
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
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
                >
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={analyzeManualTrades}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-deep"
                >
                  Analyze {manualRows.length} {manualRows.length === 1 ? "trade" : "trades"}
                </button>
                {analysis && (
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-xl border border-stroke px-4 py-2.5 text-sm text-body hover:bg-accent-tint"
                  >
                    Clear analysis
                  </button>
                )}
              </div>
            </div>
          )}

          <aside className="workspace-panel privacy-panel panel-pad">
            <span className="aside-icon">
              <ShieldCheck size={22} />
            </span>
            <p className="section-label">Local processing</p>
            <h2>Your trades stay on this device</h2>
            <p>
              Raw trades are processed in this tab. Only a summary is saved in your browser for matching. No
              broker credentials are needed.
            </p>
            <div className="privacy-detail">
              <h3>What your file needs</h3>
              <p>
                Include the instrument, side, entry and exit times, and profit or loss. Use timestamps with a
                timezone, such as <code>2026-10-01T08:15:00Z</code>.
              </p>
            </div>
            <div className="privacy-detail">
              <h3>What the numbers mean</h3>
              <p>
                Closed trades show balance drawdown. Even exported equity snapshots cannot capture every
                intratrade loss.
              </p>
            </div>
            <Link href="/matches" className="inline-action">
              Match without history <ArrowRight size={14} />
            </Link>
          </aside>
        </section>

        {/* CSV Column Mapping & Preview Section */}
        {inputMode === "csv" && preview && (
          <section
            id="column-review"
            tabIndex={-1}
            className="mt-6 rounded-2xl border border-line bg-panel p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Column Verification
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Check detected columns</h2>
                <p className="mt-1 text-sm text-muted">
                  Required columns are marked with *. Unmap a column before assigning it to another field.
                </p>
              </div>
              <button
                onClick={analyze}
                disabled={preview.validRows === 0}
                className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyze {preview.validRows} valid {preview.validRows === 1 ? "trade" : "trades"}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                {error}
              </p>
            )}
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <label key={field.id} className="text-xs font-medium text-body">
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
                      <option
                        key={`${index}-${header}`}
                        value={index}
                        disabled={Object.entries(mapping).some(
                          ([key, column]) => key !== field.id && column === index,
                        )}
                      >
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {preview.unmappedHeaders.length > 0 && (
              <p className="mt-4 text-xs text-muted">
                Unmapped columns: {preview.unmappedHeaders.join(", ")}
              </p>
            )}
            {preview.warnings.map((warning) => (
              <p key={warning} className="mt-3 text-xs text-amber-800">
                • {warning}
              </p>
            ))}

            {(preview.invalidRows.length > 0 || preview.duplicateRows.length > 0) && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-800">Rows that will be excluded</h3>
                <p className="mt-1 text-sm text-body">
                  You can analyze the valid, unique rows, but check the excluded lines first.
                </p>
                <ul
                  aria-label="Excluded rows"
                  tabIndex={0}
                  className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-body"
                >
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
              <div
                role="region"
                aria-label="Trade preview"
                tabIndex={0}
                className="mt-5 overflow-x-auto rounded-xl border border-line"
              >
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-soft text-xs uppercase text-muted">
                    <tr>
                      <th className="p-3">Instrument</th>
                      <th className="p-3">Side</th>
                      <th className="p-3">Entry (UTC)</th>
                      <th className="p-3">Exit (UTC)</th>
                      <th className="p-3">Net profit</th>
                      <th className="p-3">Planned risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-panel">
                    {preview.trades.slice(0, 6).map((trade) => (
                      <tr key={trade.rowNumber} className="text-body">
                        <td className="p-3 font-medium">{trade.symbol}</td>
                        <td className="p-3 capitalize">{trade.side}</td>
                        <td className="p-3 font-mono text-xs">
                          {trade.openTime.replace("T", " ").slice(0, 16)}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {trade.closeTime.replace("T", " ").slice(0, 16)}
                        </td>
                        <td
                          className={`p-3 font-semibold tabular-nums ${
                            trade.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
                          }`}
                        >
                          {trade.netProfit >= 0 ? "+" : ""}
                          {numberText(trade.netProfit)}
                        </td>
                        <td className="p-3 text-muted tabular-nums">
                          {trade.riskAmount !== null ? numberText(trade.riskAmount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="p-3 text-xs text-muted">Showing up to 6 of {preview.validRows} valid rows.</p>
              </div>
            )}
          </section>
        )}

        {/* Full Analytical Report */}
        {analysis && (
          <section
            id="analysis-results"
            tabIndex={-1}
            aria-label="Trade analysis results"
            className="mt-8 space-y-8"
          >
            {/* Banner to connect with Advisory Consultation */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent-line bg-accent-tint p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Trade history / Analysis
                </p>
                <h2 className="mt-1 text-2xl font-bold text-ink">
                  {analysis.metrics.tradeCount} closed{" "}
                  {analysis.metrics.tradeCount === 1 ? "trade" : "trades"} analyzed
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-body">
                  {summarySaved
                    ? "Your summary is saved on this device. Use it to compare your observed trading behaviour against researched account rules."
                    : "The analysis is ready, but your browser could not save the summary. You can still compare accounts without linking this history."}
                </p>
              </div>
              <Link
                href={summarySaved ? "/matches?historySearch=1" : "/matches"}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-deep"
              >
                <span>{summarySaved ? "Search prop firms using this history" : "Continue to matching"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Behavioral Findings in Plain, Sophisticated Trading Language */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Specialist Behavioral Assessment
              </p>
              <h3 className="mt-1 text-xl font-bold text-ink">What your trading data actually reveals</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {analysis.metrics.behavioralFindings.map((finding) => {
                  const badgeStyle =
                    finding.severity === "positive"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : finding.severity === "warning"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : finding.severity === "caution"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-accent-line bg-accent-tint text-accent";
                  return (
                    <article key={finding.id} className="rounded-2xl border border-line bg-panel p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
                        >
                          {finding.category.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          Basis:{" "}
                          {finding.evidenceBasis === "confirmed"
                            ? "Confirmed in export"
                            : "Estimated from closes"}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-semibold text-ink">{finding.title}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-body">{finding.detail}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-ink">
                Core Performance, Drawdown &amp; Concentration Metrics
              </h3>
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
                <div className="rounded-2xl border border-line bg-panel p-6">
                  <h3 className="text-base font-semibold text-ink">
                    Daily realized results · latest 14 days
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Closed P&amp;L grouped by UTC date. Prop firms may reset at 00:00 CE(S)T or server time.
                  </p>
                  <div className="mt-4 space-y-3">
                    {analysis.metrics.dailyResults.slice(-14).map((day) => {
                      const max = Math.max(
                        1,
                        ...analysis.metrics.dailyResults.map((item) => Math.abs(item.netProfit)),
                      );
                      const width = Math.max(3, (Math.abs(day.netProfit) / max) * 100);
                      const pctOfBal =
                        numericBalance > 0
                          ? ` (${((day.netProfit / numericBalance) * 100).toFixed(2)}%)`
                          : "";
                      return (
                        <div
                          key={day.date}
                          className="grid grid-cols-[72px_minmax(12px,1fr)_100px] sm:grid-cols-[90px_1fr_130px] items-center gap-3 text-xs tabular-nums"
                        >
                          <span className="font-mono text-muted">{day.date}</span>
                          <div className="h-3 rounded-full bg-accent-tint">
                            <div
                              className={`h-3 rounded-full ${
                                day.netProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span
                            className={`text-right font-medium ${
                              day.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
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
                <div className="rounded-2xl border border-line bg-panel p-6">
                  <h3 className="text-base font-semibold text-ink">
                    Performance by Trading Session (UTC Entry)
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Identifies which market sessions generate your strategy&apos;s actual realized edge.
                  </p>
                  <div className="mt-4 space-y-2.5 text-sm">
                    {analysis.metrics.sessions.map((s) => (
                      <div
                        key={s.session}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-soft px-3.5 py-2.5"
                      >
                        <div>
                          <p className="font-medium text-ink">{s.session}</p>
                          <p className="text-xs text-muted">
                            {s.trades} trade(s) · {percentText(s.winRate)} win rate
                          </p>
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${
                            s.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
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
                  <div className="rounded-2xl border border-line bg-panel p-6">
                    <h3 className="text-base font-semibold text-ink">Changes in Performance Over Time</h3>
                    <p className="mt-1 text-xs text-muted">
                      Chronological comparison of the first half vs. second half of your submitted trade
                      sample.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-xl border border-line bg-soft p-3.5">
                        <p className="text-xs font-semibold uppercase text-muted">First Half of Sample</p>
                        <p className="mt-1.5 text-lg font-bold text-ink tabular-nums">
                          {numberText(analysis.metrics.performanceHalfComparison.firstHalf.netProfit)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {analysis.metrics.performanceHalfComparison.firstHalf.trades} trades ·{" "}
                          {percentText(analysis.metrics.performanceHalfComparison.firstHalf.winRate)} win rate
                        </p>
                      </div>
                      <div className="rounded-xl border border-line bg-soft p-3.5">
                        <p className="text-xs font-semibold uppercase text-muted">Second Half of Sample</p>
                        <p className="mt-1.5 text-lg font-bold text-ink tabular-nums">
                          {numberText(analysis.metrics.performanceHalfComparison.secondHalf.netProfit)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {analysis.metrics.performanceHalfComparison.secondHalf.trades} trades ·{" "}
                          {percentText(analysis.metrics.performanceHalfComparison.secondHalf.winRate)} win
                          rate
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instrument, Direction/Weekday, and Data Limitations */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-line bg-panel p-6">
                <h3 className="font-semibold text-ink">By instrument</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-body">
                  {analysis.metrics.instruments.slice(0, 10).map((item) => (
                    <li
                      key={item.symbol}
                      className="flex items-center justify-between border-b border-line pb-2 tabular-nums"
                    >
                      <span>
                        <strong className="text-ink">{item.symbol}</strong> · {item.trades} trade(s)
                      </span>
                      <span className={item.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"}>
                        {item.netProfit >= 0 ? "+" : ""}
                        {numberText(item.netProfit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-line bg-panel p-6">
                <h3 className="font-semibold text-ink">Long / short</h3>
                <ul className="mt-3 space-y-2 text-sm text-body">
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
                <h3 className="mt-6 font-semibold text-ink">By close weekday (UTC)</h3>
                <ul className="mt-3 space-y-2 text-sm text-body">
                  {analysis.metrics.daysOfWeek.map((item) => (
                    <li key={item.day} className="flex justify-between tabular-nums">
                      <span>
                        {item.day} · {item.trades}
                      </span>
                      <span className={item.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"}>
                        {item.netProfit >= 0 ? "+" : ""}
                        {numberText(item.netProfit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-800">Limits and missing data</h3>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-body">
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
