"use client";

import Link from "next/link";
import { useState } from "react";
import { analyzeTradePreview, MAX_CSV_BYTES, previewTradeCsv, TradeCsvError } from "../../lib/trading-history/csv";
import type { CsvPreview, TradeAnalysis, TradeColumnMap, TradeField } from "../../lib/trading-history/types";

const fields: Array<{ id: TradeField; label: string; required?: boolean }> = [
  { id: "symbol", label: "Instrument", required: true }, { id: "side", label: "Buy / sell", required: true },
  { id: "openTime", label: "Entry time", required: true }, { id: "closeTime", label: "Exit time", required: true },
  { id: "profit", label: "Profit / loss", required: true }, { id: "commission", label: "Commission" },
  { id: "swap", label: "Swap / financing" }, { id: "riskAmount", label: "Planned risk" },
  { id: "tradeId", label: "Trade ID" }, { id: "balance", label: "Balance after trade" }, { id: "equity", label: "Equity after trade" },
];
const fieldClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-cyan-400";
const numberText = (value: number | null) => value === null ? "Insufficient data" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const percentText = (value: number | null) => value === null ? "Insufficient data" : `${(value * 100).toFixed(1)}%`;

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p>{note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}</div>;
}

function CumulativeProfitChart({ points }: { points: TradeAnalysis["metrics"]["dailyResults"] }) {
  const width = 820;
  const height = 260;
  const left = 58;
  const right = 18;
  const top = 20;
  const bottom = 32;
  const series = [{ date: "Start", cumulativeProfit: 0 }, ...points];
  const values = series.map((point) => point.cumulativeProfit);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const spread = max - min || 1;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const coordinates = series.map((point, index) => ({
    x: left + (series.length === 1 ? plotWidth / 2 : index / (series.length - 1) * plotWidth),
    y: top + (max - point.cumulativeProfit) / spread * plotHeight,
    point,
  }));
  const line = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const zeroY = top + (max - 0) / spread * plotHeight;
  const last = points[points.length - 1];

  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold">Cumulative realized profit and loss</h3><p className="mt-1 text-xs leading-5 text-slate-400">Daily closed-trade results accumulated in UTC, in the CSV export currency. This is not an equity curve and excludes unrealized profit or loss.</p></div>{last && <p className={`text-sm font-semibold ${last.cumulativeProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>Sample total: {numberText(last.cumulativeProfit)}</p>}</div>
    <div className="mt-4 overflow-x-auto"><svg role="img" aria-label="Line chart of cumulative realized profit and loss over the imported trade history" viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px] w-full">
      <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke="#475569" strokeDasharray="4 5" />
      <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#334155" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coordinates.slice(1).map(({ x, y, point }, index) => <circle key={`${point.date}-${index}`} cx={x} cy={y} r="3.5" fill="#67e8f9"><title>{point.date}: {numberText(point.cumulativeProfit)} cumulative</title></circle>)}
      <text x={left - 8} y={top + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{numberText(max)}</text>
      <text x={left - 8} y={height - bottom + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{numberText(min)}</text>
      <text x={left} y={height - 8} className="fill-slate-500 text-[11px]">{points[0]?.date ?? "Start"}</text>
      <text x={width - right} y={height - 8} textAnchor="end" className="fill-slate-500 text-[11px]">{last?.date ?? "End"}</text>
    </svg></div>
  </section>;
}

export default function HistoryPage() {
  const [rawCsv, setRawCsv] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState<TradeColumnMap>({});
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [startingBalance, setStartingBalance] = useState("0");

  function previewWith(csv: string, nextMapping?: TradeColumnMap) {
    try {
      const next = previewTradeCsv(csv, nextMapping);
      setPreview(next); setMapping(next.mapping); setError(""); setAnalysis(null);
    } catch (cause) {
      setPreview(null); setAnalysis(null);
      setError(cause instanceof TradeCsvError ? cause.message : "The CSV could not be read. Check the file and try again.");
    }
  }

  async function importFile(file?: File) {
    setError(""); setPreview(null); setAnalysis(null); setFileName(""); setRawCsv("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") { setError("Choose a CSV file. No other file types are accepted."); return; }
    if (file.size > MAX_CSV_BYTES) { setError("This file is larger than the 5 MB limit."); return; }
    const csv = await file.text();
    setRawCsv(csv); setFileName(file.name); previewWith(csv);
  }

  function changeMapping(field: TradeField, value: string) {
    const next = { ...mapping };
    if (value === "") delete next[field]; else next[field] = Number(value);
    setMapping(next);
    if (rawCsv) previewWith(rawCsv, next);
  }

  function analyze() {
    try {
      const balance = Number(startingBalance);
      if (!Number.isFinite(balance) || balance < 0) throw new TradeCsvError("Starting balance must be a non-negative number.");
      if (!preview) throw new TradeCsvError("Choose a CSV file first.");
      const report = analyzeTradePreview(preview, balance);
      setAnalysis(report); setError("");
      try {
        // Only derived aggregate metrics leave the page; CSV rows remain in memory.
        localStorage.setItem("propfirm-history-summary", JSON.stringify({
          tradeCount: report.metrics.tradeCount,
          averageHoldingMinutes: report.metrics.averageHoldingMinutes,
          averageTradesPerActiveWeek: report.metrics.averageTradesPerActiveWeek,
          maxLosingStreak: report.metrics.maxLosingStreak,
          largestRealizedDailyLossPct: balance > 0 ? report.metrics.largestRealizedDailyLoss / balance * 100 : null,
          maximumBalanceDrawdownPct: balance > 0 ? report.metrics.maximumBalanceDrawdown / balance * 100 : null,
          profitFactor: report.metrics.profitFactor,
          expectancy: report.metrics.expectancy,
          bestDayProfitShare: report.metrics.bestDayProfitShare,
        }));
        window.dispatchEvent(new Event("propfirm-history-summary-change"));
      } catch { /* Search remains available when browser storage is disabled. */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The trade data could not be analyzed.");
    }
  }

  function clear() {
    setRawCsv(""); setPreview(null); setAnalysis(null); setMapping({}); setFileName(""); setError("");
    try { localStorage.removeItem("propfirm-history-summary"); window.dispatchEvent(new Event("propfirm-history-summary-change")); } catch { /* Local report can still be cleared in memory. */ }
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-8"><Link href="/" className="text-sm text-cyan-300 hover:underline">PropFirm Intelligence</Link><p className="mb-3 mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Trading history</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">See what your closed trades show.</h1><p className="mt-4 max-w-3xl leading-7 text-slate-400">Preview and map a CSV before analysis. The file is read in this browser tab and is not uploaded or saved by this page.</p></header>

    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><h2 className="text-xl font-semibold">Import your trade history</h2><p className="mt-2 text-sm leading-6 text-slate-400">The importer suggests matching columns. Confirm them below and review invalid or duplicate rows before analyzing.</p>
        <div className="mt-6 flex flex-wrap items-end gap-4"><label className="block text-sm text-slate-300">Starting balance<input aria-label="Starting balance" inputMode="decimal" className={`${fieldClass} block w-52`} value={startingBalance} onChange={(event) => setStartingBalance(event.target.value)} /></label><label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Choose CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} /></label>{preview && <button className="rounded-xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800" onClick={clear}>Clear analysis</button>}</div>
        <p className="mt-4 text-xs text-slate-500">CSV only · up to 5 MB and 10,000 trades · timestamps must include a timezone</p>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
        {preview && <p role="status" className="mt-5 text-sm text-emerald-300">Previewing {fileName}: {preview.validRows} valid, {preview.invalidRows.length} invalid, {preview.duplicateRows.length} duplicate of {preview.totalRows} rows.</p>}
      </div>
      <aside className="rounded-2xl border border-slate-800 p-6"><h2 className="font-semibold">Data stays local to this tab</h2><p className="mt-3 text-sm leading-6 text-slate-400">Nothing is sent to a server. Clear the analysis or close the tab to discard the imported file. Data is held in page memory only for this workflow.</p><p className="mt-4 text-sm leading-6 text-slate-400">Balance drawdown can be estimated from closed trades. Equity drawdown needs exported equity values and still cannot reveal the maximum floating loss between snapshots.</p></aside>
    </section>

    {preview && <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Check detected columns</h2><p className="mt-1 text-sm text-slate-400">Required columns are marked. Leave unavailable optional fields unmapped.</p></div><button onClick={analyze} disabled={preview.validRows === 0} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Analyze {preview.validRows} valid trades</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <label key={field.id} className="text-sm text-slate-300">{field.label}{field.required ? " *" : ""}<select aria-label={field.label} className={fieldClass} value={mapping[field.id] === undefined ? "" : String(mapping[field.id])} onChange={(event) => changeMapping(field.id, event.target.value)}><option value="">Not mapped</option>{preview.headers.map((header, index) => <option key={`${index}-${header}`} value={index}>{header || `Column ${index + 1}`}</option>)}</select></label>)}</div>
      {preview.unmappedHeaders.length > 0 && <p className="mt-4 text-sm text-slate-400">Unmapped columns: {preview.unmappedHeaders.join(", ")}</p>}
      {preview.warnings.map((warning) => <p key={warning} className="mt-3 text-sm text-amber-200">{warning}</p>)}
      {(preview.invalidRows.length > 0 || preview.duplicateRows.length > 0) && <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><h3 className="font-semibold text-amber-200">Rows that will be excluded</h3><p className="mt-1 text-sm text-slate-300">You can analyze the valid, unique rows, but check the excluded lines first.</p><ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-300">{preview.invalidRows.slice(0, 20).map((item) => <li key={item.rowNumber}>Row {item.rowNumber}: {item.errors.join(" ")}</li>)}{preview.duplicateRows.slice(0, 20).map((row) => <li key={`dup-${row}`}>Row {row}: duplicate trade.</li>)}</ul></div>}
      {preview.trades.length > 0 && <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Instrument</th><th className="p-3">Side</th><th className="p-3">Entry (UTC)</th><th className="p-3">Exit (UTC)</th><th className="p-3">Net profit</th></tr></thead><tbody>{preview.trades.slice(0, 5).map((trade) => <tr key={trade.rowNumber} className="border-t border-slate-800 text-slate-200"><td className="p-3">{trade.symbol}</td><td className="p-3 capitalize">{trade.side}</td><td className="p-3">{trade.openTime.replace("T", " ").slice(0, 16)}</td><td className="p-3">{trade.closeTime.replace("T", " ").slice(0, 16)}</td><td className="p-3">{numberText(trade.netProfit)}</td></tr>)}</tbody></table><p className="p-3 text-xs text-slate-500">Showing up to 5 of {preview.validRows} valid rows.</p></div>}
    </section>}

    {analysis && <section className="mt-10" aria-live="polite"><div className="mb-5"><h2 className="text-2xl font-semibold">Historical sample report</h2><p className="mt-1 text-sm text-slate-400">These describe the imported sample; they do not predict future performance.</p><p className="mt-3 text-sm text-cyan-100">Derived trade count and holding-time summary saved in this browser only. The raw CSV is not saved.</p><a href="/matches?historySearch=1" className="mt-3 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Search prop firms using this history</a><p className="mt-2 text-xs leading-5 text-slate-500">This starts a preliminary search with history context. Review the starter profile and press Search prop firms to personalize the results.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Trades" value={analysis.metrics.tradeCount.toLocaleString()} note={`${analysis.metrics.wins} wins · ${analysis.metrics.losses} losses · ${analysis.metrics.breakeven} break-even`} /><Metric label="Net profit" value={numberText(analysis.metrics.netProfit)} note="Export currency; fees applied when mapped." /><Metric label="Win rate" value={percentText(analysis.metrics.winRate)} /><Metric label="Profit factor" value={numberText(analysis.metrics.profitFactor)} note="Gross wins divided by gross losses." /><Metric label="Expectancy per trade" value={numberText(analysis.metrics.expectancy)} /><Metric label="Average win / loss" value={analysis.metrics.averageRewardRisk === null ? "Insufficient data" : `${analysis.metrics.averageRewardRisk.toFixed(2)} : 1`} /><Metric label="Trades per active week" value={numberText(analysis.metrics.averageTradesPerActiveWeek)} /><Metric label="Average holding" value={`${analysis.metrics.averageHoldingMinutes.toFixed(0)} min`} /><Metric label={analysis.trades.every((trade) => trade.observedBalance !== null) ? "Balance drawdown (sampled)" : "Balance drawdown (estimate)"} value={numberText(analysis.metrics.maximumBalanceDrawdown)} /><Metric label="Equity drawdown (sampled)" value={numberText(analysis.metrics.maximumSampledEquityDrawdown)} note="Exported equity snapshots only." /><Metric label="Largest realized daily loss" value={numberText(analysis.metrics.largestRealizedDailyLoss)} /><Metric label="Longest win / loss streak" value={`${analysis.metrics.maxWinningStreak} / ${analysis.metrics.maxLosingStreak}`} /><Metric label="Best day share of net profit" value={percentText(analysis.metrics.bestDayProfitShare)} /></div>

      {analysis.metrics.dailyResults.length > 0 && <CumulativeProfitChart points={analysis.metrics.dailyResults} />}
      {analysis.metrics.dailyResults.length > 0 && <div className="mt-6 rounded-2xl border border-slate-800 p-6"><h3 className="font-semibold">Daily realized results · latest 14 days</h3><div className="mt-4 space-y-3">{analysis.metrics.dailyResults.slice(-14).map((day) => { const max = Math.max(1, ...analysis.metrics.dailyResults.map((item) => Math.abs(item.netProfit))); const width = Math.max(2, Math.abs(day.netProfit) / max * 100); return <div key={day.date} className="grid grid-cols-[90px_1fr_100px] items-center gap-3 text-xs"><span className="text-slate-400">{day.date}</span><div className="h-3 rounded bg-slate-800"><div className={`h-3 rounded ${day.netProfit >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-300">{numberText(day.netProfit)}</span></div>; })}</div></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3"><div className="rounded-2xl border border-slate-800 p-6"><h3 className="font-semibold">By instrument</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{analysis.metrics.instruments.slice(0, 10).map((item) => <li key={item.symbol} className="flex justify-between"><span>{item.symbol} · {item.trades}</span><span>{numberText(item.netProfit)}</span></li>)}</ul></div><div className="rounded-2xl border border-slate-800 p-6"><h3 className="font-semibold">Long / short</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{analysis.metrics.directionPerformance.map((item) => <li key={item.side} className="flex justify-between"><span>{item.side} · {item.trades} trades</span><span>{percentText(item.winRate)} wins</span></li>)}</ul><h3 className="mt-5 font-semibold">By close weekday (UTC)</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{analysis.metrics.daysOfWeek.map((item) => <li key={item.day} className="flex justify-between"><span>{item.day} · {item.trades}</span><span>{numberText(item.netProfit)}</span></li>)}</ul></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6"><h3 className="font-semibold text-amber-200">Limits and missing data</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{analysis.metrics.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}{analysis.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div></div>
    </section>}
  </div></main>;
}
