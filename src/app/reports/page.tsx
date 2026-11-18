"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { firmAccounts } from "@/data/firms";
import { generateAdvisoryReport } from "@/lib/matching/report";
import type { TraderProfile } from "@/lib/matching/types";
import {
  deleteSavedDossier,
  getActiveUserSession,
  getSavedDossiers,
  loginTraderAccount,
  logoutTraderAccount,
  registerTraderAccount,
  saveAdvisoryDossier,
  type SavedAdvisoryDossier,
} from "@/lib/storage/workspace";

const subscribeWorkspace = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("propfirm-workspace-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("propfirm-workspace-change", callback);
  };
};

const getSessionRaw = () => {
  try {
    return localStorage.getItem("propfirm-user-session");
  } catch {
    return null;
  }
};

const getDossiersRaw = () => {
  try {
    return localStorage.getItem("propfirm-saved-dossiers");
  } catch {
    return null;
  }
};

export default function ReportsPage() {
  const sessionRaw = useSyncExternalStore(subscribeWorkspace, getSessionRaw, () => null);
  const dossiersRaw = useSyncExternalStore(subscribeWorkspace, getDossiersRaw, () => null);

  const userSession = sessionRaw ? getActiveUserSession() : null;
  const dossiers: SavedAdvisoryDossier[] = dossiersRaw ? getSavedDossiers() : [];

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [experienceYears, setExperienceYears] = useState("5");
  const [primaryMarkets, setPrimaryMarkets] = useState("EUR/USD, GBP/USD, XAU/USD");
  const [authError, setAuthError] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  const activeDossier =
    dossiers.find((d) => d.id === selectedDossierId) ?? dossiers[0] ?? null;

  function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    if (authMode === "register") {
      const res = registerTraderAccount({
        name,
        email,
        passcode,
        experienceYears: Number(experienceYears) || 3,
        primaryMarkets,
      });
      if (res.error) setAuthError(res.error);
      else setPasscode("");
    } else {
      const res = loginTraderAccount({ email, passcode });
      if (res.error) setAuthError(res.error);
      else setPasscode("");
    }
  }

  function createSampleDossier() {
    const sampleProfile: TraderProfile = {
      tradingStyle: "intraday",
      strategyDescription:
        "London and NY overlap M15 liquidity sweep and H1 structure continuation on EUR/USD and GBP/USD. Risking 0.5% per trade for 1:2.5 targets. Flat before daily rollover.",
      tradesPerWeek: 8,
      requiresWeekendHolding: false,
      preferredDrawdown: "static",
      maxBudget: 250,
      budgetCurrency: "EUR",
      minimumAccountSize: 25_000,
      avoidsConsistencyRules: true,
      tradesNews: false,
      usesAutomation: false,
      marketsTraded: "EUR/USD, GBP/USD",
      riskPerTradePct: 0.5,
      typicalRewardRisk: 2.5,
      executionTimeframe: "M15 / H1",
      primarySessions: "London, NY Overlap",
    };
    const sampleHistory = {
      tradeCount: 18,
      averageHoldingMinutes: 112,
      averageTradesPerActiveWeek: 6,
      maxLosingStreak: 3,
      largestRealizedDailyLossPct: 1.45,
      maximumBalanceDrawdownPct: 2.9,
      profitFactor: 1.92,
      expectancy: 58,
      bestDayProfitShare: 0.29,
      netProfit: 1044,
      winRate: 0.61,
      overnightTradesCount: 0,
      weekendTradesCount: 0,
      shortHoldTradesCount: 0,
    };
    const report = generateAdvisoryReport(sampleProfile, firmAccounts, sampleHistory);
    const created = saveAdvisoryDossier({
      title: "FTMO 2-Step $25K · London Intraday Consultation",
      profile: sampleProfile,
      history: sampleHistory,
      report,
    });
    if (created) setSelectedDossierId(created.id);
  }

  return (
    <main className="min-h-screen px-4 py-9 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Trader Workspace &amp; Saved Advisory Dossiers
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Your private consultation archive.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Manage your trader workspace profile and review saved prop-firm advisory reports. Never enter broker
              passwords or trading-account credentials—this platform operates strictly on strategy telemetry and
              closed-trade exports.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createSampleDossier}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              + Generate Sample Saved Dossier
            </button>
            <Link
              href="/matches"
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              New Consultation →
            </Link>
          </div>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left Column: Trader Account & Saved Reports List */}
          <div className="space-y-6">
            {/* Authentication / Trader Profile Card */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              {userSession ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Active Trader Profile
                    </span>
                    <button
                      type="button"
                      onClick={logoutTraderAccount}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-white">{userSession.name}</h2>
                  <p className="text-xs text-slate-400">{userSession.email}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                    <div>
                      <p className="text-slate-500">Experience</p>
                      <p className="font-semibold text-slate-200">{userSession.experienceYears} years</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Primary Markets</p>
                      <p className="font-semibold text-slate-200">{userSession.primaryMarkets}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Trader Workspace Sign-In</h2>
                    <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("register");
                          setAuthError("");
                        }}
                        className={`rounded-md px-2.5 py-1 font-semibold ${
                          authMode === "register" ? "bg-cyan-400 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        Register
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                        }}
                        className={`rounded-md px-2.5 py-1 font-semibold ${
                          authMode === "login" ? "bg-cyan-400 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Create a local advisory profile to organize your strategy consultations and saved reports in this
                    browser.
                  </p>

                  <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3 text-xs">
                    {authMode === "register" && (
                      <label className="block text-slate-300">
                        Trader Name
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        />
                      </label>
                    )}
                    <label className="block text-slate-300">
                      Email Address
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@example.com"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block text-slate-300">
                      Workspace Passcode (never use your broker password)
                      <input
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="At least 6 characters"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>
                    {authMode === "register" && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-slate-300">
                          Years Trading
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                        </label>
                        <label className="block text-slate-300">
                          Markets
                          <input
                            value={primaryMarkets}
                            onChange={(e) => setPrimaryMarkets(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                        </label>
                      </div>
                    )}
                    {authError && <p className="text-rose-300">{authError}</p>}
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                      {authMode === "register" ? "Create Workspace Profile" : "Sign In to Workspace"}
                    </button>
                  </form>
                </div>
              )}
            </section>

            {/* Saved Dossiers List */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Saved Dossiers ({dossiers.length})</h2>
              </div>

              {dossiers.length === 0 ? (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-5 text-slate-400">
                  <p>No saved advisory reports yet.</p>
                  <button
                    type="button"
                    onClick={createSampleDossier}
                    className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-semibold text-cyan-200 hover:bg-cyan-400/20"
                  >
                    Load Sample Advisory Dossier
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {dossiers.map((item) => {
                    const isSelected = activeDossier?.id === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`rounded-xl border p-3.5 transition ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDossierId(item.id)}
                            className="text-left"
                          >
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {item.report.executiveRecommendation.primaryAccount?.firmName ?? "No Match"} ·{" "}
                              {item.createdAt.slice(0, 10)}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedDossier(item.id)}
                            className="text-xs text-slate-500 hover:text-rose-300"
                            title="Delete saved dossier"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right Column: Active Saved Dossier Full Viewer */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
            {!activeDossier ? (
              <div className="py-12 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  No Dossier Selected
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Save a consultation from the Advisory page or generate a sample dossier
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
                  Saved reports preserve your exact strategy snapshot, empirical trade-history summary, 9-point
                  executive thesis, and 8-rule A/B/C/D operational breakdown.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={createSampleDossier}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Generate Sample Dossier Now
                  </button>
                  <Link
                    href="/matches"
                    className="rounded-xl border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:border-cyan-400"
                  >
                    Start New Consultation →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Saved Advisory Dossier · {activeDossier.createdAt.slice(0, 10)}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-white">{activeDossier.title}</h2>
                    <p className="mt-2 text-sm text-cyan-200">
                      {activeDossier.report.executiveRecommendation.headline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="no-print rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400"
                  >
                    Print / Export PDF
                  </button>
                </div>

                <p className="text-sm leading-7 text-slate-200">
                  {activeDossier.report.executiveRecommendation.executiveNarrative}
                </p>

                <div className="grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-bold text-white">Strategy &amp; Risk Snapshot</p>
                    <p className="mt-1 text-slate-300">
                      Style: <strong className="capitalize">{activeDossier.profile.tradingStyle}</strong> · Markets:{" "}
                      {activeDossier.profile.marketsTraded} · Risk/Trade:{" "}
                      {activeDossier.profile.riskPerTradePct !== null
                        ? `${activeDossier.profile.riskPerTradePct}%`
                        : "Unspecified"}
                    </p>
                    {activeDossier.profile.strategyDescription && (
                      <p className="mt-2 text-slate-400 italic">
                        &ldquo;{activeDossier.profile.strategyDescription}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-bold text-white">Empirical History Linked</p>
                    {activeDossier.history ? (
                      <p className="mt-1 text-slate-300">
                        {activeDossier.history.tradeCount} trades · Profit Factor:{" "}
                        {activeDossier.history.profitFactor?.toFixed(2) ?? "N/A"} · Max Losing Streak:{" "}
                        {activeDossier.history.maxLosingStreak} · Peak Daily Loss:{" "}
                        {activeDossier.history.largestRealizedDailyLossPct?.toFixed(2) ?? "N/A"}%
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-400">No CSV trade history was attached to this consultation.</p>
                    )}
                  </div>
                </div>

                {/* Rule Breakdowns inside Saved Dossier */}
                <div>
                  <h3 className="text-base font-bold text-white">
                    Rule-by-Rule Operational Breakdown (A / B / C / D)
                  </h3>
                  <div className="mt-3 space-y-3">
                    {activeDossier.report.ruleBreakdowns.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-5"
                      >
                        <p className="font-bold text-cyan-300">{rule.title}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <p className="text-slate-300">
                            <strong className="text-white">A. Rule:</strong> {rule.whatTheRuleSays}
                          </p>
                          <p className="text-slate-300">
                            <strong className="text-white">B. In Practice:</strong> {rule.whatItMeansInPractice}
                          </p>
                          <p className="text-slate-300">
                            <strong className="text-white">C. For You:</strong> {rule.whatItMeansForYou}
                          </p>
                          <p className="text-slate-300">
                            <strong className="text-emerald-300">D. Protocol:</strong> {rule.howToManageIt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
