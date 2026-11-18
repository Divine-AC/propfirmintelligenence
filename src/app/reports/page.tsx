"use client";

import Link from "next/link";
import { ArrowRight, FilePlus2, FileText, FolderOpen, Plus, Printer, Trash2, UserRound } from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
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

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");

  const activeDossier = dossiers.find((d) => d.id === selectedDossierId) ?? dossiers[0] ?? null;

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
      title: "Sample · London intraday consultation",
      profile: sampleProfile,
      history: sampleHistory,
      report,
    });
    if (created) {
      setStorageError("");
      selectDossier(created.id);
    } else setStorageError("The sample could not be saved. Make sure browser storage is available.");
  }

  function selectDossier(id: string) {
    setSelectedDossierId(id);
    setDeleteTarget(null);
    if (window.matchMedia("(max-width: 780px)").matches) {
      requestAnimationFrame(() => document.getElementById("report-viewer")?.focus());
    }
  }

  return (
    <main className="shell inner-page">
      <div className="min-w-0">
        <PageHeading
          eyebrow="Workspace / Archive"
          title="Saved reports"
          description="Revisit your consultations, review the rules behind each match, and export a copy. Reports stay in this browser."
        >
          <Link href="/matches" className="btn btn-primary">
            <Plus size={16} />
            New consultation
          </Link>
        </PageHeading>
        {storageError && (
          <p role="alert" className="mb-4 text-sm text-rose-800">
            {storageError}
          </p>
        )}
        <div className="report-layout">
          <div className="reports-sidebar">
            {/* Saved Dossiers List */}
            <section className="report-list no-print rounded-2xl border border-line bg-panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <FolderOpen size={17} />
                  Report library <span className="count-label">{dossiers.length}</span>
                </h2>
                {dossiers.length > 0 && (
                  <button
                    type="button"
                    aria-label="Add a sample report"
                    className="icon-button"
                    onClick={createSampleDossier}
                  >
                    <FilePlus2 size={16} />
                  </button>
                )}
              </div>

              {dossiers.length === 0 ? (
                <div className="mt-4 rounded-xl border border-line bg-soft p-4 text-xs leading-5 text-muted">
                  Reports you save from the strategy matcher will appear here.
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
                            ? "border-accent bg-accent-tint"
                            : "border-line bg-soft hover:border-stroke"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => selectDossier(item.id)}
                            className="text-left"
                          >
                            <p className="text-xs font-bold text-ink">{item.title}</p>
                            <p className="mt-1 text-[11px] text-muted">
                              {item.report.executiveRecommendation.primaryAccount?.firmName ?? "No Match"} ·{" "}
                              {item.createdAt.slice(0, 10)}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item.id)}
                            className="icon-button hover:text-rose-800"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {deleteTarget === item.id && (
                          <div className="delete-confirm">
                            <p>Delete this saved report?</p>
                            <button type="button" onClick={() => setDeleteTarget(null)}>
                              Keep report
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteSavedDossier(item.id);
                                setDeleteTarget(null);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Authentication / Trader Profile Card */}
            <section id="workspace-profile" className="no-print rounded-2xl border border-line bg-panel p-5">
              {userSession ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active local profile
                    </span>
                    <button
                      type="button"
                      onClick={logoutTraderAccount}
                      className="text-xs text-muted hover:text-ink"
                    >
                      Sign out
                    </button>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-ink">{userSession.name}</h2>
                  <p className="text-xs text-muted">{userSession.email}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-soft p-3 text-xs">
                    <div>
                      <p className="text-muted">Experience</p>
                      <p className="font-semibold text-body">{userSession.experienceYears} years</p>
                    </div>
                    <div>
                      <p className="text-muted">Primary Markets</p>
                      <p className="font-semibold text-body">{userSession.primaryMarkets}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                      <UserRound size={16} />
                      Local profile
                    </h2>
                    <div className="segmented compact" role="group" aria-label="Profile mode">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("register");
                          setAuthError("");
                        }}
                        aria-pressed={authMode === "register"}
                      >
                        Register
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                        }}
                        aria-pressed={authMode === "login"}
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-muted">
                    A profile is optional. You can save and read reports without signing in.
                  </p>

                  <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3 text-xs">
                    {authMode === "register" && (
                      <label className="block text-body">
                        Name
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          placeholder="e.g. Alex Morgan"
                          className="field"
                        />
                      </label>
                    )}
                    <label className="block text-body">
                      Email address
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@example.com"
                        className="field"
                      />
                    </label>
                    <label className="block text-body">
                      Workspace passcode
                      <input
                        type="password"
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="At least 6 characters"
                        className="field"
                      />
                    </label>
                    <p className="field-hint">Use a separate passcode, never your broker password.</p>
                    {authMode === "register" && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-body">
                          Years trading
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            className="field"
                          />
                        </label>
                        <label className="block text-body">
                          Markets
                          <input
                            value={primaryMarkets}
                            onChange={(e) => setPrimaryMarkets(e.target.value)}
                            className="field"
                          />
                        </label>
                      </div>
                    )}
                    {authError && (
                      <p role="alert" className="text-rose-800">
                        {authError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-accent px-4 py-2.5 font-bold text-white transition hover:bg-accent-deep"
                    >
                      {authMode === "register" ? "Create local profile" : "Sign in"}
                    </button>
                  </form>
                </div>
              )}
            </section>
          </div>

          <section id="report-viewer" tabIndex={-1} className="report-viewer workspace-panel">
            {!activeDossier ? (
              <div className="empty-state archive-empty">
                <span className="empty-icon">
                  <FileText size={31} />
                </span>
                <p className="section-label">Consultation archive</p>
                <h2>Your reports start here</h2>
                <p>
                  Save a match report to keep its strategy snapshot, risk analysis, and rule breakdown
                  together. Or open a sample to see what’s inside.
                </p>
                <div className="empty-actions">
                  <Link href="/matches" className="btn btn-primary">
                    Start a consultation <ArrowRight size={15} />
                  </Link>
                  <button type="button" onClick={createSampleDossier} className="btn btn-secondary">
                    Load sample report
                  </button>
                </div>
              </div>
            ) : (
              <div className="report-document space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Saved consultation · {activeDossier.createdAt.slice(0, 10)}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-ink">{activeDossier.title}</h2>
                    <p className="mt-2 text-sm text-accent">
                      {activeDossier.report.executiveRecommendation.headline}
                    </p>
                  </div>
                  <button type="button" onClick={() => window.print()} className="no-print btn btn-secondary">
                    <Printer size={15} />
                    Print / save PDF
                  </button>
                </div>

                <p className="text-sm leading-7 text-body">
                  {activeDossier.report.executiveRecommendation.executiveNarrative}
                </p>

                <div className="grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-soft p-4">
                    <p className="font-bold text-ink">Strategy &amp; Risk Snapshot</p>
                    <p className="mt-1 text-body">
                      Style: <strong className="capitalize">{activeDossier.profile.tradingStyle}</strong> ·
                      Markets: {activeDossier.profile.marketsTraded} · Risk/Trade:{" "}
                      {activeDossier.profile.riskPerTradePct !== null
                        ? `${activeDossier.profile.riskPerTradePct}%`
                        : "Unspecified"}
                    </p>
                    {activeDossier.profile.strategyDescription && (
                      <p className="mt-2 text-muted italic">
                        &ldquo;{activeDossier.profile.strategyDescription}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-line bg-soft p-4">
                    <p className="font-bold text-ink">Empirical History Linked</p>
                    {activeDossier.history ? (
                      <p className="mt-1 text-body">
                        {activeDossier.history.tradeCount} trades · Profit Factor:{" "}
                        {activeDossier.history.profitFactor?.toFixed(2) ?? "N/A"} · Max Losing Streak:{" "}
                        {activeDossier.history.maxLosingStreak} · Peak Daily Loss:{" "}
                        {activeDossier.history.largestRealizedDailyLossPct?.toFixed(2) ?? "N/A"}%
                      </p>
                    ) : (
                      <p className="mt-1 text-muted">
                        No CSV trade history was attached to this consultation.
                      </p>
                    )}
                  </div>
                </div>

                {/* Rule Breakdowns inside Saved Dossier */}
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Rule-by-Rule Operational Breakdown (A / B / C / D)
                  </h3>
                  <div className="mt-3 space-y-3">
                    {activeDossier.report.ruleBreakdowns.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-line bg-soft p-4 text-xs leading-5"
                      >
                        <p className="font-bold text-accent">{rule.title}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <p className="text-body">
                            <strong className="text-ink">A. Rule:</strong> {rule.whatTheRuleSays}
                          </p>
                          <p className="text-body">
                            <strong className="text-ink">B. In Practice:</strong> {rule.whatItMeansInPractice}
                          </p>
                          <p className="text-body">
                            <strong className="text-ink">C. For You:</strong> {rule.whatItMeansForYou}
                          </p>
                          <p className="text-body">
                            <strong className="text-emerald-800">D. Protocol:</strong> {rule.howToManageIt}
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
