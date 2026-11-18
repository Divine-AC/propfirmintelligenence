"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { firmAccounts } from "@/data/firms";
import { assessAccount, decidePrimaryRecommendation } from "@/lib/matching/advisory";
import { generateAdvisoryReport } from "@/lib/matching/report";
import type { TraderProfile, TradingStyle } from "@/lib/matching/types";
import { evaluateConsultationReadiness } from "@/lib/strategy/consultation";
import { saveAdvisoryDossier } from "@/lib/storage/workspace";
import { analyzeTradeCsv } from "@/lib/trading-history/csv";
import { buildHistorySummary } from "@/lib/trading-history/analytics";
import type { TradeHistorySummary } from "@/lib/trading-history/types";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400";

const initialProfile: TraderProfile = {
  tradingStyle: "intraday",
  strategyDescription: "",
  tradesPerWeek: 5,
  requiresWeekendHolding: false,
  preferredDrawdown: "either",
  maxBudget: 100,
  budgetCurrency: "USD",
  minimumAccountSize: 10_000,
  avoidsConsistencyRules: false,
  tradesNews: false,
  usesAutomation: false,
  marketsTraded: "Forex",
  riskPerTradePct: null,
  executionTimeframe: "M15 / H1",
  primarySessions: "London, New York",
  typicalRewardRisk: 2.0,
};

// Pin the locale so Node's server render and the visitor's browser emit the
// same currency symbols and separators during hydration.
const currency = (amount: number, code: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);

const styles: Array<{ value: TradingStyle; label: string }> = [
  { value: "scalping", label: "Scalping" },
  { value: "intraday", label: "Day trading" },
  { value: "swing", label: "Swing trading" },
  { value: "news", label: "News trading" },
];

const profilePresets: Array<{ label: string; patch: Partial<TraderProfile> }> = [
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

const DEMO_CONSULTATION_CSV = `symbol,side,openTime,closeTime,profit,commission,swap,risk_amount
EURUSD,buy,2026-10-01T08:15:00Z,2026-10-01T10:40:00Z,320,-7,-1.5,100
GBPUSD,sell,2026-10-01T13:20:00Z,2026-10-01T15:05:00Z,-105,-7,0,100
XAUUSD,buy,2026-10-02T09:00:00Z,2026-10-02T12:30:00Z,410,-10,-2,125
EURUSD,sell,2026-10-05T07:45:00Z,2026-10-05T09:10:00Z,210,-7,0,100
USDJPY,buy,2026-10-06T14:10:00Z,2026-10-06T16:50:00Z,-110,-7,-1,100
GBPUSD,sell,2026-10-06T17:10:00Z,2026-10-06T18:35:00Z,-95,-7,0,100
GBPUSD,buy,2026-10-07T08:30:00Z,2026-10-07T11:15:00Z,360,-7,0,125
XAUUSD,sell,2026-10-08T12:00:00Z,2026-10-08T14:45:00Z,290,-10,0,125
EURUSD,buy,2026-10-09T09:20:00Z,2026-10-09T10:55:00Z,-100,-7,0,100
EURUSD,buy,2026-10-12T08:05:00Z,2026-10-12T11:20:00Z,265,-7,0,100
USDJPY,sell,2026-10-13T13:15:00Z,2026-10-13T15:40:00Z,195,-7,0,100
XAUUSD,buy,2026-10-14T12:30:00Z,2026-10-14T14:10:00Z,-115,-10,0,125`;

const subscribeHistory = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("propfirm-history-summary-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("propfirm-history-summary-change", callback);
  };
};

const getHistorySnapshot = () => {
  try {
    return localStorage.getItem("propfirm-history-summary");
  } catch {
    return null;
  }
};

const subscribeLocation = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};

const getHistoryIntent = () => new URLSearchParams(window.location.search).has("historySearch");

export default function MatchesPage() {
  const [profile, setProfile] = useState<TraderProfile>(initialProfile);
  const historySnapshot = useSyncExternalStore(subscribeHistory, getHistorySnapshot, () => null);
  const history = useMemo(() => {
    if (!historySnapshot) return null;
    try {
      return JSON.parse(historySnapshot) as TradeHistorySummary;
    } catch {
      return null;
    }
  }, [historySnapshot]);
  const historyPrompt = useSyncExternalStore(subscribeLocation, getHistoryIntent, () => false);

  const [hasSearched, setHasSearched] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [inspectedAccountId, setInspectedAccountId] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState<"all" | "elevated" | "verified">("all");
  const [simulatedRiskPct, setSimulatedRiskPct] = useState<number | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);

  const consultation = useMemo(
    () => evaluateConsultationReadiness(profile, history),
    [profile, history]
  );

  const assessments = useMemo(
    () =>
      hasSearched
        ? firmAccounts
            .map((account) => assessAccount(profile, account, history))
            .sort(
              (a, b) =>
                Number(b.eligible) - Number(a.eligible) ||
                (b.score ?? -1) - (a.score ?? -1) ||
                a.account.accountSize - b.account.accountSize
            )
        : [],
    [hasSearched, profile, history]
  );

  const decision = useMemo(() => decidePrimaryRecommendation(assessments), [assessments]);

  const effectiveProfileForReport = useMemo(() => {
    if (simulatedRiskPct === null) return profile;
    return { ...profile, riskPerTradePct: simulatedRiskPct };
  }, [profile, simulatedRiskPct]);

  const report = useMemo(() => {
    if (!hasSearched) return null;
    if (inspectedAccountId) {
      const target = firmAccounts.find((a) => a.id === inspectedAccountId);
      if (target) {
        const reordered = [target, ...firmAccounts.filter((a) => a.id !== inspectedAccountId)];
        const baseReport = generateAdvisoryReport(effectiveProfileForReport, reordered, history);
        // Ensure if the user explicitly clicked to inspect a specific account, we show its rule breakdown
        if (baseReport.executiveRecommendation.primaryAccount?.id !== target.id) {
          const singleReport = generateAdvisoryReport(effectiveProfileForReport, [target], history);
          return {
            ...baseReport,
            ruleBreakdowns: singleReport.ruleBreakdowns,
            riskAndScenarioAnalysis: singleReport.riskAndScenarioAnalysis,
            evidenceAuditLog: singleReport.evidenceAuditLog,
          };
        }
        return baseReport;
      }
    }
    return generateAdvisoryReport(effectiveProfileForReport, firmAccounts, history);
  }, [hasSearched, effectiveProfileForReport, history, inspectedAccountId]);

  const eligible = assessments.filter((item) => item.eligible);
  const excluded = assessments.filter((item) => !item.eligible);

  function update<K extends keyof TraderProfile>(key: K, value: TraderProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function startSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
    setSaveConfirmation(null);
  }

  function loadDemoHistoryInline() {
    try {
      const parsed = analyzeTradeCsv(DEMO_CONSULTATION_CSV, 25_000);
      const summary = buildHistorySummary(parsed, 25_000);
      localStorage.setItem("propfirm-history-summary", JSON.stringify(summary));
      window.dispatchEvent(new Event("propfirm-history-summary-change"));
    } catch {
      // Ignore if storage unavailable
    }
  }

  function handleSaveDossier() {
    if (!report) return;
    const saved = saveAdvisoryDossier({
      title:
        saveTitle.trim() ||
        `${report.executiveRecommendation.primaryAccount?.firmName ?? "Advisory"} · ${profile.tradingStyle} (${currency(
          profile.maxBudget,
          profile.budgetCurrency
        )} budget)`,
      profile,
      history,
      report,
    });
    if (saved) {
      setSaveConfirmation(`Saved "${saved.title}" to your Trader Workspace.`);
      setSaveTitle("");
    }
  }

  const inspectedAccount =
    (inspectedAccountId ? firmAccounts.find((a) => a.id === inspectedAccountId) : null) ??
    report?.executiveRecommendation.primaryAccount ??
    null;

  const filteredRuleBreakdowns = useMemo(() => {
    if (!report) return [];
    if (ruleFilter === "elevated") {
      return report.ruleBreakdowns.filter((r) => r.riskLevel === "elevated" || r.riskLevel === "moderate");
    }
    if (ruleFilter === "verified") {
      return report.ruleBreakdowns.filter((r) => r.status === "verified");
    }
    return report.ruleBreakdowns;
  }, [report, ruleFilter]);

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Step 1 · Your trading profile
            </p>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
              Find your prop firm match.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Fill in your trading preferences below, then select Search prop firms. We’ll show you matching accounts, important rules and any details that still need verification. Adding trade history is optional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Profile completeness
              </p>
              <p className="mt-0.5 text-lg font-bold text-cyan-300 tabular-nums">
                {consultation.completenessPct}% Complete
              </p>
            </div>
            {!history ? (
              <button
                type="button"
                onClick={loadDemoHistoryInline}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Try with 12 sample trades
              </button>
            ) : (
              <Link
                href="/history"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                ✓ {history.tradeCount} Trades Linked · View Diagnostics
              </Link>
            )}
          </div>
        </header>

        {historyPrompt && (
          <div role="status" className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
            <h2 className="font-semibold text-cyan-100">Trading history is ready to inform your search</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Review the profile below and choose <strong>Search prop firms</strong>. Your closed-trade summary can add
              context to the results; it does not simulate every firm rule or predict a pass.
            </p>
            {!history && (
              <p className="mt-2 text-sm text-amber-200">
                No saved history summary was found in this browser. You can still search, or{" "}
                <Link className="underline" href="/history">
                  import your CSV again
                </Link>
                .
              </p>
            )}
          </div>
        )}

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          {/* Left Column: Guided Strategy & Risk Consultation Form */}
          <form
            onSubmit={startSearch}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  1 · Trader &amp; Strategy Consultation
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">Tell us how you trade</h2>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Quick presets:</span>
              {profilePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setProfile((current) => ({ ...current, ...preset.patch }));
                    setInspectedAccountId(null);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Natural-Language Strategy Walkthrough */}
            <div className="mt-5 rounded-xl border border-slate-800/90 bg-slate-950/70 p-4">
              <label className="block text-sm font-semibold text-white">
                Describe your strategy (optional)
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-400">
                  Walk me through how you trade: How do you identify a setup and confirm entry? Which timeframes and
                  sessions do you use? Where does your stop-loss go, what is your target, and when do you avoid
                  trading?
                </span>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={profile.strategyDescription}
                  onChange={(e) => update("strategyDescription", e.target.value)}
                  placeholder="For example: I trade EUR/USD and XAU/USD during the London/NY overlap using H1 structure and M15 liquidity sweeps, risking 0.5% per trade for 1:2.5 targets. Always flat before daily rollover and high-impact news."
                />
              </label>

              {/* Live Extracted Strategy Intelligence Badges */}
              {(consultation.extracted.methodology.length > 0 ||
                consultation.extracted.instruments.length > 0 ||
                consultation.extracted.timeframes.length > 0 ||
                consultation.extracted.sessions.length > 0 ||
                consultation.extracted.riskPerTradePct !== null ||
                consultation.extracted.rewardRisk !== null ||
                consultation.extracted.holdingBehavior) && (
                <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                      Extracted from your description
                    </p>
                    {Object.keys(consultation.suggestedPatch).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setProfile((curr) => ({ ...curr, ...consultation.suggestedPatch }))}
                        className="rounded-md bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/30"
                      >
                        Sync Extracted Details to Form →
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {consultation.extracted.methodology.map((m) => (
                      <span key={m} className="rounded bg-slate-900 px-2 py-0.5 text-cyan-200">
                        Methodology: {m}
                      </span>
                    ))}
                    {consultation.extracted.instruments.map((inst) => (
                      <span key={inst} className="rounded bg-slate-900 px-2 py-0.5 text-slate-200">
                        Pair: {inst}
                      </span>
                    ))}
                    {consultation.extracted.timeframes.length > 0 && (
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-slate-200">
                        TF: {consultation.extracted.timeframes.join("/")}
                      </span>
                    )}
                    {consultation.extracted.sessions.length > 0 && (
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-slate-200">
                        Session: {consultation.extracted.sessions.join(", ")}
                      </span>
                    )}
                    {consultation.extracted.riskPerTradePct !== null && (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                        Risk: {consultation.extracted.riskPerTradePct}%
                      </span>
                    )}
                    {consultation.extracted.rewardRisk !== null && (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                        Target: 1:{consultation.extracted.rewardRisk}
                      </span>
                    )}
                    {consultation.extracted.holdingBehavior && (
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-amber-200">
                        {consultation.extracted.holdingBehavior}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Follow-Up Questions & Contradiction Alerts */}
            {consultation.followUps.length > 0 && (
              <div className="mt-4 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Specialist Follow-Up Questions ({consultation.followUps.length})
                </p>
                {consultation.followUps.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 text-xs ${
                      item.type === "contradiction" || item.type === "history_discrepancy"
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-slate-800 bg-slate-950/80"
                    }`}
                  >
                    <p className="font-semibold text-white">{item.question}</p>
                    <p className="mt-1 leading-5 text-slate-300">{item.context}</p>
                    {item.options.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {item.options.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setProfile((curr) => ({ ...curr, ...opt.patch }))}
                            className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Structured Methodology & Execution Inputs */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Trading style
                <select
                  className={inputClass}
                  value={profile.tradingStyle}
                  onChange={(e) => update("tradingStyle", e.target.value as TradingStyle)}
                >
                  {styles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-300">
                Markets you trade
                <input
                  className={inputClass}
                  value={profile.marketsTraded}
                  onChange={(e) => update("marketsTraded", e.target.value)}
                  placeholder="Forex, indices, metals…"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Timeframes used
                <input
                  className={inputClass}
                  value={profile.executionTimeframe ?? ""}
                  onChange={(e) => update("executionTimeframe", e.target.value)}
                  placeholder="e.g. M15 / H1 / H4"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Primary trading sessions
                <input
                  className={inputClass}
                  value={profile.primarySessions ?? ""}
                  onChange={(e) => update("primarySessions", e.target.value)}
                  placeholder="e.g. London, NY Overlap"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Trades per week
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="1000"
                  value={profile.tradesPerWeek}
                  onChange={(e) => update("tradesPerWeek", Number(e.target.value))}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Preferred drawdown
                <select
                  className={inputClass}
                  value={profile.preferredDrawdown}
                  onChange={(e) =>
                    update("preferredDrawdown", e.target.value as TraderProfile["preferredDrawdown"])
                  }
                >
                  <option value="either">No preference</option>
                  <option value="static">Static</option>
                  <option value="trailing">Trailing</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Maximum entry budget
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={profile.maxBudget}
                  onChange={(e) => update("maxBudget", Number(e.target.value))}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Budget currency
                <select
                  className={inputClass}
                  value={profile.budgetCurrency}
                  onChange={(e) =>
                    update("budgetCurrency", e.target.value as TraderProfile["budgetCurrency"])
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm text-slate-300">
              Minimum account size (USD)
              <select
                className={inputClass}
                value={profile.minimumAccountSize}
                onChange={(e) => update("minimumAccountSize", Number(e.target.value))}
              >
                {[0, 2500, 5000, 10000, 25000, 50000, 100000, 200000].map((size) => (
                  <option key={size} value={size}>
                    {size === 0 ? "No minimum" : currency(size, "USD")}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="mt-6 space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-sm text-slate-300">
              <legend className="px-1 font-semibold text-white">Strategy requirements</legend>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={profile.requiresWeekendHolding}
                  onChange={(e) => update("requiresWeekendHolding", e.target.checked)}
                />
                <span>I need to hold positions over weekends</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={profile.tradesNews}
                  onChange={(e) => update("tradesNews", e.target.checked)}
                />
                <span>My strategy trades around news events</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={profile.usesAutomation}
                  onChange={(e) => update("usesAutomation", e.target.checked)}
                />
                <span>I use an EA or other automation</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={profile.avoidsConsistencyRules}
                  onChange={(e) => update("avoidsConsistencyRules", e.target.checked)}
                />
                <span>I want to avoid consistency rules</span>
              </label>
            </fieldset>

            <details className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Risk sizing &amp; reward-to-risk detail (for daily-loss stress testing)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Risk per trade (%)
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 0.5"
                    value={profile.riskPerTradePct ?? ""}
                    onChange={(e) =>
                      update("riskPerTradePct", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Typical reward-to-risk (R)
                  <input
                    className={inputClass}
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    placeholder="e.g. 2.0"
                    value={profile.typicalRewardRisk ?? ""}
                    onChange={(e) =>
                      update("typicalRewardRisk", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Used to compute your exact daily loss buffer, consecutive-loss breach threshold, and losing-streak
                stress scenario.
              </p>
            </details>

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
            >
              Search prop firms
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Compatibility scores are deterministic comparisons, not probabilities of passing or receiving payouts.
              Prices are compared only in the currency you select.
            </p>
          </form>

          {/* Right Column: Complete 11-Section Advisory Consultation Report */}
          <section aria-live="polite" className="space-y-6">
            {!hasSearched || !report ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7 sm:p-9">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  27 researched account options · 4 firms · Rule-level verification
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">Your results will appear here</h2>
                <p className="mt-3 leading-7 text-slate-300">
                  Complete the profile, then press <strong>Search prop firms</strong> at the bottom of the form. You’ll see your results here, including:
                </p>
                <ul className="mt-4 grid gap-2.5 text-sm text-slate-300 sm:grid-cols-2">
                  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <strong className="text-cyan-300">1. Executive Recommendation</strong>
                    <span className="mt-1 block text-xs text-slate-400">
                      9-point decision thesis grounded in your strategy and history
                    </span>
                  </li>
                  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <strong className="text-cyan-300">2. Rule-by-Rule A/B/C/D Breakdown</strong>
                    <span className="mt-1 block text-xs text-slate-400">
                      What every rule says, means in practice, means for you, and how to manage it
                    </span>
                  </li>
                  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <strong className="text-cyan-300">3. Daily Loss &amp; Streak Simulator</strong>
                    <span className="mt-1 block text-xs text-slate-400">
                      Compounded losing-streak exposure &amp; hard daily stop protocol
                    </span>
                  </li>
                  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <strong className="text-cyan-300">4. Pricing, Alternatives &amp; Citations</strong>
                    <span className="mt-1 block text-xs text-slate-400">
                      Cost per $1K drawdown, why runner-ups rank lower, and official links
                    </span>
                  </li>
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link
                    href="/history"
                    className="inline-flex text-sm font-semibold text-cyan-300 hover:underline"
                  >
                    Analyze trading history first →
                  </Link>
                  <Link
                    href="/compare"
                    className="inline-flex text-sm font-semibold text-slate-400 hover:text-white"
                  >
                    Or inspect the 27-programme rule matrix →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Sticky Dossier Navigation & Save Bar */}
                <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-4 py-2.5 shadow-lg backdrop-blur">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <a
                      href="#executive-summary"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      1. Executive Verdict
                    </a>
                    <a
                      href="#rule-breakdown"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      2. Rule Breakdown (A/B/C/D)
                    </a>
                    <a
                      href="#risk-scenarios"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      3. Risk &amp; Scenarios
                    </a>
                    <a
                      href="#pricing-tradeoffs"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      4. Price &amp; Trade-Offs
                    </a>
                    <a
                      href="#alternatives-section"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      5. Alternatives
                    </a>
                    <a
                      href="#evidence-audit"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      6. Evidence
                    </a>
                    <a
                      href="#catalogue-matches"
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-300 hover:bg-slate-900 hover:text-cyan-300"
                    >
                      7. All Matches ({eligible.length})
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Report name (optional)"
                      className="hidden w-40 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white sm:block"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDossier}
                      className="rounded-lg border border-cyan-400/50 bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/25"
                    >
                      Save Dossier
                    </button>
                  </div>
                </div>

                {saveConfirmation && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                    <span>✓ {saveConfirmation}</span>
                    <Link href="/reports" className="font-semibold underline">
                      Open Saved Dossiers →
                    </Link>
                  </div>
                )}

                {/* SECTION 1: Executive Recommendation & 9-Point Thesis */}
                <div
                  id="executive-summary"
                  className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 shadow-xl sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        Search summary · Executive Advisory Verdict
                      </p>
                      <h2 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                        {eligible.length} compatible options · {excluded.length} excluded
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        decision.isPurchaseRecommendation
                          ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border border-amber-400/40 bg-amber-400/15 text-amber-200"
                      }`}
                    >
                      {decision.isPurchaseRecommendation
                        ? "Decision-Ready Recommendation"
                        : "Preliminary Candidate · Evidence Gaps"}
                    </span>
                  </div>

                  <p className="mt-3 text-base font-semibold text-cyan-200">
                    {report.executiveRecommendation.headline}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {report.executiveRecommendation.executiveNarrative}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{decision.message}</p>

                  {!decision.isPurchaseRecommendation && (
                    <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm leading-6 text-amber-100">
                      A high compatibility score does not clear missing evidence. Check the unknowns and open the
                      official rules before deciding.
                    </p>
                  )}

                  {/* 9-Point Personalized Advisory Thesis */}
                  {report.executiveRecommendation.primaryAccount && (
                    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                          9-Point Specialist Advisory Thesis
                        </h3>
                        <span className="text-xs text-slate-400 tabular-nums">
                          Suitability: {report.executiveRecommendation.suitabilityScore ?? "—"}% · Verified Rule
                          Coverage: {report.executiveRecommendation.evidenceCoveragePct}%
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">1. Recommended Firm &amp; Programme</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.firmAndProgramme}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">2. Account Size &amp; Verified Price</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.sizeAndPrice}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">3. Why It Fits Your Strategy</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.strategyFit}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">4. Drawdown Model vs. Your Behaviour</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.drawdownFit}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">5. Holding, Session &amp; News Interaction</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.operationalRestrictionsInteraction}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">6. CSV Trade-History Strengths &amp; Vulnerabilities</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.historyStrengthsAndVulnerabilities}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
                          <p className="font-semibold text-white">7. Evaluation Structure &amp; Payout Fit</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.evaluationAndPayoutFit}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                          <p className="font-semibold text-amber-200">8. Known Disadvantages of This Account</p>
                          <p className="mt-1 text-slate-300">
                            {report.executiveRecommendation.ninePointThesis.knownDisadvantages}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs leading-5">
                        <p className="font-semibold text-cyan-200">
                          9. Research Confidence &amp; Evidence Completeness
                        </p>
                        <p className="mt-1 text-slate-300">
                          {report.executiveRecommendation.ninePointThesis.confidenceAndEvidence}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-800 px-3 py-1">27 account records</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1">4 researched firms</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1">Rules checked 29 Oct 2026</span>
                  </div>
                </div>

                {/* SECTION 2: Detailed Rule-by-Rule Breakdown (A / B / C / D Framework) */}
                {inspectedAccount && report.ruleBreakdowns.length > 0 && (
                  <div
                    id="rule-breakdown"
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                          Rule-by-Rule Specialist Breakdown (A / B / C / D)
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-white">
                          How {inspectedAccount.firmName} · {inspectedAccount.programmeName} actually operates
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {(["all", "elevated", "verified"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setRuleFilter(tab)}
                            className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                              ruleFilter === tab
                                ? "bg-cyan-400 text-slate-950"
                                : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {tab === "all"
                              ? `All (${report.ruleBreakdowns.length})`
                              : tab === "elevated"
                              ? "Elevated / Watch Items"
                              : "Verified Only"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {filteredRuleBreakdowns.map((rule) => {
                        const badgeColor =
                          rule.riskLevel === "elevated"
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                            : rule.riskLevel === "moderate"
                            ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                            : rule.riskLevel === "unverified"
                            ? "border-slate-600 bg-slate-800 text-slate-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

                        return (
                          <article
                            key={rule.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-base font-bold text-white">{rule.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${badgeColor}`}>
                                  {rule.riskLevel === "elevated"
                                    ? "Elevated Friction"
                                    : rule.riskLevel === "moderate"
                                    ? "Active Management Needed"
                                    : rule.riskLevel === "unverified"
                                    ? "Unverified Rule"
                                    : "Compatible"}
                                </span>
                                {rule.sourceUrl && (
                                  <a
                                    href={rule.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-cyan-300 underline hover:text-cyan-200"
                                  >
                                    Official Source ({rule.verifiedAt})
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 text-xs leading-5 sm:grid-cols-2">
                              <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3">
                                <p className="font-bold uppercase tracking-wide text-slate-300">
                                  A. What the rule says
                                </p>
                                <p className="mt-1 text-slate-200">{rule.whatTheRuleSays}</p>
                              </div>
                              <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3">
                                <p className="font-bold uppercase tracking-wide text-cyan-300">
                                  B. What the rule means in practice
                                </p>
                                <p className="mt-1 text-slate-200">{rule.whatItMeansInPractice}</p>
                              </div>
                              <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3">
                                <p className="font-bold uppercase tracking-wide text-amber-300">
                                  C. What it means for this trader
                                </p>
                                <p className="mt-1 text-slate-200">{rule.whatItMeansForYou}</p>
                              </div>
                              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                <p className="font-bold uppercase tracking-wide text-emerald-300">
                                  D. How to manage the restriction
                                </p>
                                <p className="mt-1 text-slate-200">{rule.howToManageIt}</p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 3: Personalised Risk & Rule-Management Scenario Simulator */}
                <div
                  id="risk-scenarios"
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        Personalised Risk &amp; Rule-Management Guidance
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-white">
                        Stress-testing your sizing &amp; trade history against programme limits
                      </h3>
                    </div>

                    {/* Interactive Risk-Per-Trade Stress-Tester */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5 text-xs">
                      <span className="px-2 text-slate-400">Simulate Risk/Trade:</span>
                      {[0.25, 0.5, 0.75, 1.0, 1.5].map((pct) => {
                        const activeRisk = simulatedRiskPct ?? profile.riskPerTradePct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setSimulatedRiskPct(pct)}
                            className={`rounded-lg px-2 py-1 font-semibold tabular-nums transition ${
                              activeRisk === pct
                                ? "bg-cyan-400 text-slate-950"
                                : "text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {pct}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-cyan-300">Daily Loss Buffer Analysis</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            report.riskAndScenarioAnalysis.dailyLossBuffer.status === "comfortable"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : report.riskAndScenarioAnalysis.dailyLossBuffer.status === "tight"
                              ? "bg-amber-400/15 text-amber-200"
                              : report.riskAndScenarioAnalysis.dailyLossBuffer.status === "breach_risk"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {report.riskAndScenarioAnalysis.dailyLossBuffer.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-5 text-slate-200">
                        {report.riskAndScenarioAnalysis.dailyLossBuffer.explanation}
                      </p>
                      <p className="mt-2.5 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5 text-xs font-medium text-cyan-100">
                        {report.riskAndScenarioAnalysis.dailyLossBuffer.recommendedDailyStopProtocol}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4">
                      <p className="text-xs font-bold uppercase text-cyan-300">Overall Drawdown Cushion</p>
                      <p className="mt-2.5 text-xs leading-5 text-slate-200">
                        {report.riskAndScenarioAnalysis.overallDrawdownBuffer.explanation}
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase text-cyan-300">
                        Consistency &amp; Profit Concentration Check
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-200">
                        {report.riskAndScenarioAnalysis.consistencyCheck.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Purchase Readiness Verdict */}
                  <div
                    className={`mt-4 rounded-xl border p-4 ${
                      report.riskAndScenarioAnalysis.purchaseReadinessVerdict.readyToPurchaseNow ===
                      "yes_with_discipline"
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : report.riskAndScenarioAnalysis.purchaseReadinessVerdict.readyToPurchaseNow ===
                          "caution_refine_first"
                        ? "border-amber-400/30 bg-amber-400/10"
                        : "border-rose-500/30 bg-rose-500/10"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-white">
                      Whether Purchasing This Account Makes Sense Right Now
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {report.riskAndScenarioAnalysis.purchaseReadinessVerdict.headline}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-200">
                      {report.riskAndScenarioAnalysis.purchaseReadinessVerdict.rationale.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* SECTION 4: Price, Fee Efficiency & Financial Trade-Offs */}
                <div
                  id="pricing-tradeoffs"
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Price &amp; Financial Trade-Off Analysis
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    What the evaluation costs and what you are actually paying for
                  </h3>

                  <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-slate-400">Entry Fee &amp; Capital</p>
                      <p className="mt-1 text-lg font-bold text-white tabular-nums">
                        {report.financialTradeOffAnalysis.entryPriceFormatted}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          for {report.financialTradeOffAnalysis.simulatedCapitalFormatted}
                        </span>
                      </p>
                      {report.financialTradeOffAnalysis.basePriceFormatted && (
                        <p className="mt-1 text-amber-200">
                          Promotional offer · Standard fee {report.financialTradeOffAnalysis.basePriceFormatted}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-slate-400">True Risk Capital (Max Drawdown Room)</p>
                      <p className="mt-1 text-lg font-bold text-cyan-300 tabular-nums">
                        {report.financialTradeOffAnalysis.maxDrawdownRoomAmount !== null
                          ? `$${report.financialTradeOffAnalysis.maxDrawdownRoomAmount.toLocaleString("en-US")}`
                          : "Unverified"}
                      </p>
                      <p className="mt-1 text-slate-400">
                        {report.financialTradeOffAnalysis.costPerThousandDrawdownRoom !== null
                          ? `${report.financialTradeOffAnalysis.costPerThousandDrawdownRoom.toFixed(2)} per $1,000 of drawdown room`
                          : "Fee efficiency unverified"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-slate-400">Refund &amp; Recurring Fee Policy</p>
                      <p className="mt-1 text-slate-200">{report.financialTradeOffAnalysis.refundPolicy}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="font-bold text-white">Cheapest vs. Best-Fit Assessment</p>
                      <p className="mt-1 text-slate-300">
                        {report.financialTradeOffAnalysis.cheapestVsBestFitVerdict}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <p className="font-bold text-rose-200">Financial Downside If Breached</p>
                      <p className="mt-1 text-slate-300">
                        {report.financialTradeOffAnalysis.financialDownsideIfBreached}
                      </p>
                    </div>
                  </div>

                  {report.financialTradeOffAnalysis.comparisonRows.length > 0 && (
                    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400">
                          <tr>
                            <th className="p-3">Programme</th>
                            <th className="p-3">Entry Fee</th>
                            <th className="p-3">Max Drawdown ($)</th>
                            <th className="p-3">Cost / $1K Drawdown</th>
                            <th className="p-3">Refund Policy</th>
                            <th className="p-3">Trade-Off Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                          {report.financialTradeOffAnalysis.comparisonRows.map((row) => (
                            <tr
                              key={row.accountId}
                              className={row.isRecommended ? "bg-cyan-400/10" : undefined}
                            >
                              <td className="p-3 font-semibold text-white">
                                {row.firmName} · {row.programmeName}
                              </td>
                              <td className="p-3 tabular-nums text-slate-200">
                                {row.entryPrice !== null
                                  ? currency(row.entryPrice, row.priceCurrency)
                                  : "Unverified"}
                              </td>
                              <td className="p-3 tabular-nums text-slate-200">
                                {row.maxDrawdownDollar !== null
                                  ? `$${row.maxDrawdownDollar.toLocaleString("en-US")}`
                                  : "—"}
                              </td>
                              <td className="p-3 tabular-nums text-cyan-300">
                                {row.costPer1kDrawdown !== null
                                  ? currency(row.costPer1kDrawdown, row.priceCurrency)
                                  : "—"}
                              </td>
                              <td className="p-3 text-slate-300">{row.refundSummary}</td>
                              <td className="p-3 text-slate-300">{row.tradeOffNote}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION 5: Why Other Accounts Rank Lower */}
                {report.alternativesAnalysis.length > 0 && (
                  <div
                    id="alternatives-section"
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Comparative Alternative Analysis
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">
                      Why alternative accounts rank lower for your specific profile
                    </h3>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {report.alternativesAnalysis.map((alt) => (
                        <article
                          key={alt.account.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/75 p-4 text-xs leading-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-cyan-300">{alt.account.firmName}</p>
                                <h4 className="text-sm font-bold text-white">{alt.account.programmeName}</h4>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                  alt.disadvantageSeverity === "deal_breaker"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : alt.disadvantageSeverity === "evidence_gap"
                                    ? "bg-amber-400/20 text-amber-200"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {alt.disadvantageSeverity.replace(/_/g, " ")}
                              </span>
                            </div>

                            <p className="mt-2.5 text-slate-300">
                              <strong className="text-white">What makes it attractive:</strong>{" "}
                              {alt.whatMakesItAttractive}
                            </p>
                            <p className="mt-2 text-slate-300">
                              <strong className="text-rose-200">Why it ranks lower:</strong> {alt.whyItRanksLower}
                            </p>
                            <p className="mt-2 text-slate-300">
                              <strong className="text-emerald-300">When to reconsider:</strong>{" "}
                              {alt.whenToReconsider}
                            </p>
                          </div>

                          <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedAccountId(alt.account.id);
                                document.getElementById("rule-breakdown")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="font-semibold text-cyan-300 hover:underline"
                            >
                              Inspect full 8-rule breakdown for this account →
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 6: Research Evidence & Verification Audit Trail */}
                {report.evidenceAuditLog.entries.length > 0 && (
                  <div
                    id="evidence-audit"
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                          Research Evidence &amp; Verification Dates
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-white">
                          Official documentation backing this recommendation
                        </h3>
                      </div>
                      <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-mono text-slate-300">
                        Snapshot: {report.evidenceAuditLog.researchSnapshotDate} ·{" "}
                        {report.evidenceAuditLog.verifiedCount}/{report.evidenceAuditLog.totalRulesChecked} Rules
                        Verified
                      </span>
                    </div>

                    {report.evidenceAuditLog.unresolvedConflictsAndGaps.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-xs leading-5">
                        <p className="font-bold text-amber-200">
                          Disclosed Phase Distinctions &amp; Unresolved Documentation Notes
                        </p>
                        <ul className="mt-1.5 space-y-1 text-slate-300">
                          {report.evidenceAuditLog.unresolvedConflictsAndGaps.map((note) => (
                            <li key={note}>• {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400">
                          <tr>
                            <th className="p-3">Rule Checkpoint</th>
                            <th className="p-3">Extracted Value</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Official Source &amp; Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                          {report.evidenceAuditLog.entries.map((entry) => (
                            <tr key={entry.ruleLabel}>
                              <td className="p-3 font-medium text-white">{entry.ruleLabel}</td>
                              <td className="p-3 text-slate-200">
                                {entry.valueSummary}
                                {entry.operationalNote && (
                                  <span className="mt-0.5 block text-[11px] text-slate-400">
                                    {entry.operationalNote}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    entry.status === "verified"
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-amber-400/15 text-amber-200"
                                  }`}
                                >
                                  {entry.status}
                                </span>
                              </td>
                              <td className="p-3">
                                {entry.sourceUrl ? (
                                  <a
                                    href={entry.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 underline"
                                  >
                                    Official source ({entry.verifiedAt})
                                  </a>
                                ) : (
                                  <span className="text-slate-500">Not confirmed in official docs</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 7: Final Decision Summary Checklist */}
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Final Decision Summary
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-white">
                    {report.finalDecisionSummary.recommendationHeadline}
                  </h3>
                  <div className="mt-4 grid gap-4 text-xs leading-5 sm:grid-cols-3">
                    <div>
                      <p className="font-bold text-emerald-300">Why Choose This Account</p>
                      <ul className="mt-1.5 space-y-1 text-slate-200">
                        {report.finalDecisionSummary.keyReasonsToChoose.map((r) => (
                          <li key={r}>✓ {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-amber-200">Critical Risks to Respect</p>
                      <ul className="mt-1.5 space-y-1 text-slate-200">
                        {report.finalDecisionSummary.criticalRisksToRespect.map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-cyan-200">Pre-Purchase Verification Checklist</p>
                      <ul className="mt-1.5 space-y-1 text-slate-200">
                        {report.finalDecisionSummary.prePurchaseChecklist.map((c) => (
                          <li key={c}>☐ {c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* SECTION 8: All Compatible & Excluded Account Cards */}
                <div id="catalogue-matches" className="space-y-4">
                  <h3 className="text-lg font-bold text-white">
                    All Compatible Programmes ({eligible.length})
                  </h3>

                  {eligible.length === 0 && (
                    <div className="rounded-2xl border border-amber-400/30 p-5 text-sm leading-6 text-amber-100">
                      No account passed the documented hard checks. Review excluded options below, or adjust your
                      profile only if your actual requirements allow it.
                    </div>
                  )}

                  {eligible.map((item) => {
                    const account = item.account;
                    const primary = decision.account?.id === account.id;
                    const isCurrentlyInspected = inspectedAccount?.id === account.id;
                    const priceLabel =
                      account.price.status === "verified" && account.price.value !== null
                        ? currency(account.price.value, account.priceCurrency)
                        : "Price not verified";
                    const ruleSources = [
                      account.price,
                      account.profitTargetsPct,
                      account.dailyLossLimitPct,
                      account.overallLossLimitPct,
                      account.drawdownType,
                      account.weekendRule,
                      account.payoutTerms,
                    ].filter((rule) => rule.status === "verified" && rule.sourceUrl);

                    return (
                      <article
                        key={account.id}
                        className={`rounded-2xl border bg-slate-900/50 p-5 sm:p-6 ${
                          primary ? "border-cyan-400/60" : "border-slate-800"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-cyan-300">{account.firmName}</p>
                            <h3 className="mt-1 text-xl font-semibold">{account.programmeName}</h3>
                            <p className="mt-1 text-sm text-slate-400">
                              {currency(account.accountSize, "USD")} account · {priceLabel}
                              {account.basePrice?.status === "verified" &&
                              account.basePrice.value !== account.price.value &&
                              account.basePrice.value !== null
                                ? ` (standard ${currency(account.basePrice.value, account.priceCurrency)})`
                                : ""}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-800 px-3 py-2 text-right">
                            <p className="text-2xl font-bold text-white tabular-nums">
                              {item.score === null ? "—" : `${item.score}%`}
                            </p>
                            <p className="text-xs text-slate-400">
                              compatibility · {item.scoreCoveragePct}% criteria covered
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {primary && (
                            <p className="inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                              {decision.isPurchaseRecommendation
                                ? "Best documented fit"
                                : "Preliminary candidate · evidence missing"}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedAccountId(account.id);
                              document.getElementById("rule-breakdown")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              isCurrentlyInspected
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
                            }`}
                          >
                            {isCurrentlyInspected
                              ? "✓ Currently shown in Rule Breakdown above"
                              : "Inspect Rule-by-Rule Breakdown ↑"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-950/70 p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">Key rules</p>
                            <p className="mt-2 text-sm text-slate-200">
                              {account.evaluationPhases.status === "verified"
                                ? `${account.evaluationPhases.value ?? "?"} evaluation phase(s)`
                                : "Phase count unverified"}{" "}
                              · target{" "}
                              {account.profitTargetsPct.status === "verified"
                                ? `${(account.profitTargetsPct.value ?? []).join("% / ")}%`
                                : "unverified"}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              Daily loss{" "}
                              {account.dailyLossLimitPct.status === "verified"
                                ? `${account.dailyLossLimitPct.value}%`
                                : "unknown"}{" "}
                              · overall loss{" "}
                              {account.overallLossLimitPct.status === "verified"
                                ? `${account.overallLossLimitPct.value}%`
                                : "unknown"}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              Drawdown{" "}
                              {account.drawdownType.status === "verified"
                                ? account.drawdownType.value
                                : "unverified"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-950/70 p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">Why it appears</p>
                            {item.reasons.length ? (
                              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                                {item.reasons.slice(0, 3).map((reason) => (
                                  <li key={reason}>✓ {reason}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-sm text-slate-400">
                                No scored criteria have been confirmed yet.
                              </p>
                            )}
                          </div>
                        </div>

                        {item.historyObservations.length > 0 && (
                          <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-semibold uppercase text-cyan-200">
                              From your imported history
                            </p>
                            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                              {item.historyObservations.map((observation) => (
                                <li key={observation}>{observation}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(item.warnings.length > 0 || item.missingDecisionEvidence.length > 0) && (
                          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                            <p className="text-xs font-semibold uppercase text-amber-200">Unknowns to review</p>
                            <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50">
                              {[
                                ...new Set([
                                  ...item.missingDecisionEvidence.map(
                                    (value) => `Evidence not confirmed: ${value}.`
                                  ),
                                  ...item.warnings,
                                ]),
                              ]
                                .slice(0, 6)
                                .map((warning) => (
                                  <li key={warning}>• {warning}</li>
                                ))}
                            </ul>
                          </div>
                        )}

                        <details className="mt-4 rounded-xl border border-slate-800 p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                            Sources and rule evidence ({ruleSources.length} links)
                          </summary>
                          <ul className="mt-3 space-y-2">
                            {ruleSources.map((rule, index) => (
                              <li key={`${rule.sourceUrl}-${index}`} className="text-sm">
                                <a
                                  className="break-all text-cyan-300 underline"
                                  href={rule.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Official firm source
                                </a>
                                <span className="ml-2 text-xs text-slate-500">verified {rule.verifiedAt}</span>
                                {rule.note && (
                                  <p className="mt-1 text-xs leading-5 text-slate-400">{rule.note}</p>
                                )}
                              </li>
                            ))}
                            {ruleSources.length === 0 && (
                              <li className="text-sm text-slate-400">
                                No verified source links are recorded for the selected rules.
                              </li>
                            )}
                          </ul>
                          <p className="mt-3 text-xs text-slate-500">
                            Always confirm current prices and terms on the firm website before paying. Promotions and
                            rules can change.
                          </p>
                        </details>
                      </article>
                    );
                  })}

                  {excluded.length > 0 && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left font-semibold"
                        onClick={() => setShowExcluded((value) => !value)}
                        aria-expanded={showExcluded}
                      >
                        <span>Excluded by documented profile conflicts ({excluded.length})</span>
                        <span>{showExcluded ? "−" : "+"}</span>
                      </button>
                      {showExcluded && (
                        <ul className="mt-4 space-y-4">
                          {excluded.map((item) => (
                            <li key={item.account.id} className="border-t border-slate-800 pt-4">
                              <p className="font-medium">
                                {item.account.firmName} · {item.account.programmeName}
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-rose-200">
                                {item.reasons.map((reason) => (
                                  <li key={reason}>• {reason}</li>
                                ))}
                              </ul>
                              {item.warnings.length > 0 && (
                                <p className="mt-2 text-xs leading-5 text-amber-200">
                                  Unconfirmed: {item.warnings.join(" ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <p className="text-xs leading-5 text-slate-500">
                    No live rule monitoring is connected. Research snapshot date: 29 October 2026. Review the linked
                    official terms before payment.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
