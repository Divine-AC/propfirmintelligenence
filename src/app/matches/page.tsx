"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bookmark, ChevronDown, ListFilter } from "lucide-react";
import { ProfileWizard } from "@/components/matching/ProfileWizard";
import { SAMPLE_TRADES_CSV } from "@/data/sample-trades";
import { PageHeading } from "@/components/PageHeading";
import { Suspense, useEffect, useMemo, useState } from "react";
import { firmAccounts } from "@/data/firms";
import { assessAccount, decidePrimaryRecommendation } from "@/lib/matching/advisory";
import { generateAdvisoryReport } from "@/lib/matching/report";
import type { TraderProfile } from "@/lib/matching/types";
import { evaluateConsultationReadiness } from "@/lib/strategy/consultation";
import { saveAdvisoryDossier } from "@/lib/storage/workspace";
import { analyzeTradeCsv } from "@/lib/trading-history/csv";
import { buildHistorySummary } from "@/lib/trading-history/analytics";
import { storeTradeSummary, useTradeSummary } from "@/lib/storage/use-trade-summary";

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
  new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(
    amount,
  );

export default function MatchesPage() {
  return (
    <Suspense fallback={<MatchWorkspace historyPrompt={false} reportView={false} />}>
      <RoutedWorkspace />
    </Suspense>
  );
}

function RoutedWorkspace() {
  const params = useSearchParams();
  return (
    <MatchWorkspace
      historyPrompt={params.has("historySearch")}
      reportView={params.get("view") === "report"}
    />
  );
}

// Keep the profile in memory, but let the URL distinguish editing from reading.
// A fresh visit from another tool must not reopen a cached report or save notice.
function setReportView(visible: boolean) {
  const url = new URL(window.location.href);
  if (visible) url.searchParams.set("view", "report");
  else url.searchParams.delete("view");
  url.hash = "";
  window.history.replaceState(null, "", url);
}

function MatchWorkspace({ historyPrompt, reportView }: { historyPrompt: boolean; reportView: boolean }) {
  const [profile, setProfile] = useState<TraderProfile>(initialProfile);
  const history = useTradeSummary();
  const historyKey = useMemo(() => JSON.stringify(history), [history]);
  const [submittedHistory, setSubmittedHistory] = useState<string | null>(null);
  const hasSearched = reportView && submittedHistory === historyKey;
  const [storageError, setStorageError] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [inspectedAccountId, setInspectedAccountId] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState<"all" | "elevated" | "verified">("all");
  const [simulatedRiskPct, setSimulatedRiskPct] = useState<number | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);

  const consultation = useMemo(() => evaluateConsultationReadiness(profile, history), [profile, history]);

  const assessments = useMemo(
    () =>
      hasSearched
        ? firmAccounts
            .map((account) => assessAccount(profile, account, history))
            .sort(
              (a, b) =>
                Number(b.eligible) - Number(a.eligible) ||
                (b.score ?? -1) - (a.score ?? -1) ||
                a.account.accountSize - b.account.accountSize,
            )
        : [],
    [hasSearched, profile, history],
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

  function startSearch() {
    setStorageError("");
    setInspectedAccountId(null);
    setSimulatedRiskPct(null);
    setSubmittedHistory(historyKey);
    setReportView(true);
    setSaveConfirmation(null);
  }

  useEffect(() => {
    if (hasSearched) document.getElementById("report-start")?.focus();
  }, [hasSearched]);

  function loadDemoHistoryInline() {
    try {
      const parsed = analyzeTradeCsv(SAMPLE_TRADES_CSV, 25_000);
      const summary = buildHistorySummary(parsed, 25_000);
      if (!storeTradeSummary(summary)) throw new Error("Storage unavailable");
      setStorageError("");
    } catch {
      setStorageError(
        "Sample history could not be linked. Enable browser storage or continue without history.",
      );
    }
  }

  function handleSaveDossier() {
    if (!report) return;
    const saved = saveAdvisoryDossier({
      title:
        saveTitle.trim() ||
        `${report.executiveRecommendation.primaryAccount?.firmName ?? "Advisory"} · ${profile.tradingStyle} (${currency(
          profile.maxBudget,
          profile.budgetCurrency,
        )} budget)`,
      profile,
      history,
      report,
    });
    if (saved) {
      setStorageError("");
      setSaveConfirmation(`Saved "${saved.title}" to your Trader Workspace.`);
      setSaveTitle("");
    } else {
      setSaveConfirmation(null);
      setStorageError(
        "Your report could not be saved. Check that browser storage is available and has free space.",
      );
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
    <main className="shell inner-page">
      <div className="min-w-0">
        <PageHeading
          eyebrow="Module 01 / Strategy matching"
          title={hasSearched ? "Your match report" : "Strategy matcher"}
          description={
            hasSearched
              ? "Review your compatible accounts, the rules that matter to your strategy, and the evidence behind each result."
              : "Build a trading profile to see which accounts fit, where rules conflict, and what to verify before you buy."
          }
        >
          {hasSearched && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmittedHistory(null);
                setReportView(false);
                requestAnimationFrame(() => document.getElementById("wizard-heading")?.focus());
              }}
            >
              <ArrowLeft size={15} />
              Edit profile
            </button>
          )}
        </PageHeading>

        {storageError && !hasSearched && (
          <p role="alert" className="mb-4 text-sm text-rose-800">
            {storageError}
          </p>
        )}
        {historyPrompt && !hasSearched && (
          <div role="status" className="mb-6 rounded-2xl border border-accent-line bg-accent-tint p-5">
            <h2 className="font-semibold text-accent">Trade history for this consultation</h2>
            <p className="mt-2 text-sm leading-6 text-body">
              Review your profile and choose <strong>Search prop firms</strong> in the final step. Your
              closed-trade summary can add context to the results; it does not simulate every firm rule or
              predict a pass.
            </p>
            {!history && (
              <p className="mt-2 text-sm text-amber-800">
                No saved history summary was found in this browser. You can still search, or{" "}
                <Link className="underline" href="/history">
                  import your CSV again
                </Link>
                .
              </p>
            )}
          </div>
        )}

        {!hasSearched || !report ? (
          <ProfileWizard
            profile={profile}
            consultation={consultation}
            history={history}
            onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
            onSearch={startSearch}
            onDemoHistory={loadDemoHistoryInline}
          />
        ) : (
          <section className="match-report space-y-5" aria-label="Matching results">
            <div id="report-start" tabIndex={-1} className="report-toolbar no-print">
              <label className="report-jump">
                <ListFilter size={17} />
                <span>Jump to</span>
                <select
                  aria-label="Jump to report section"
                  value=""
                  onChange={(event) => document.getElementById(event.target.value)?.scrollIntoView()}
                >
                  <option value="" disabled>
                    Report section…
                  </option>
                  <option value="executive-summary">Executive verdict</option>
                  {inspectedAccount && report.ruleBreakdowns.length > 0 && (
                    <option value="rule-breakdown">Rule breakdown</option>
                  )}
                  <option value="risk-scenarios">Risk &amp; scenarios</option>
                  <option value="pricing-tradeoffs">Price &amp; trade-offs</option>
                  {report.alternativesAnalysis.length > 0 && (
                    <option value="alternatives-section">Alternatives</option>
                  )}
                  {report.evidenceAuditLog.entries.length > 0 && (
                    <option value="evidence-audit">Evidence audit</option>
                  )}
                  <option value="catalogue-matches">All matches ({eligible.length})</option>
                </select>
              </label>
              <div className="report-save">
                <input
                  aria-label="Report name"
                  type="text"
                  value={saveTitle}
                  onChange={(event) => setSaveTitle(event.target.value)}
                  placeholder="Report name (optional)"
                />
                <button type="button" onClick={handleSaveDossier} className="btn btn-primary">
                  <Bookmark size={15} />
                  Save report
                </button>
              </div>
            </div>

            {storageError && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                {storageError}
              </p>
            )}
            {saveConfirmation && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
              >
                <span>✓ {saveConfirmation}</span>
                <Link href="/reports" className="font-semibold underline">
                  View saved reports →
                </Link>
              </div>
            )}

            {/* SECTION 1: Executive Recommendation & 9-Point Thesis */}
            <div
              id="executive-summary"
              className="rounded-2xl border border-stroke bg-panel p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Search summary · Executive Advisory Verdict
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold text-ink sm:text-2xl">
                    {eligible.length} compatible options · {excluded.length} excluded
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    decision.isPurchaseRecommendation
                      ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "border border-amber-200 bg-amber-100 text-amber-800"
                  }`}
                >
                  {decision.isPurchaseRecommendation
                    ? "Decision-Ready Recommendation"
                    : "Preliminary Candidate · Evidence Gaps"}
                </span>
              </div>

              <p className="mt-3 text-base font-semibold text-accent">
                {report.executiveRecommendation.headline}
              </p>
              <p className="mt-2 text-sm leading-6 text-body">
                {report.executiveRecommendation.executiveNarrative}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">{decision.message}</p>

              {!decision.isPurchaseRecommendation && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-6 text-amber-800">
                  A high compatibility score does not clear missing evidence. Check the unknowns and open the
                  official rules before deciding.
                </p>
              )}

              {/* 9-Point Personalized Advisory Thesis */}
              {report.executiveRecommendation.primaryAccount && (
                <details className="report-disclosure mt-5 rounded-xl border border-line bg-soft p-4 sm:p-5">
                  <summary>
                    <span className="font-semibold">Why this account fits</span>
                    <span className="disclosure-meta">9-point assessment</span>
                    <ChevronDown size={16} />
                  </summary>
                  <p className="mt-3 text-xs text-muted">
                    Suitability: {report.executiveRecommendation.suitabilityScore ?? "—"}% · Verified rule
                    coverage: {report.executiveRecommendation.evidenceCoveragePct}%
                  </p>
                  <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">1. Recommended Firm &amp; Programme</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.firmAndProgramme}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">2. Account Size &amp; Verified Price</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.sizeAndPrice}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">3. Why It Fits Your Strategy</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.strategyFit}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">4. Drawdown Model vs. Your Behaviour</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.drawdownFit}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">5. Holding, Session &amp; News Interaction</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.operationalRestrictionsInteraction}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">
                        6. CSV Trade-History Strengths &amp; Vulnerabilities
                      </p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.historyStrengthsAndVulnerabilities}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <p className="font-semibold text-ink">7. Evaluation Structure &amp; Payout Fit</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.evaluationAndPayoutFit}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="font-semibold text-amber-800">8. Known Disadvantages of This Account</p>
                      <p className="mt-1 text-body">
                        {report.executiveRecommendation.ninePointThesis.knownDisadvantages}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-accent-line bg-accent-tint p-3 text-xs leading-5">
                    <p className="font-semibold text-accent">
                      9. Research Confidence &amp; Evidence Completeness
                    </p>
                    <p className="mt-1 text-body">
                      {report.executiveRecommendation.ninePointThesis.confidenceAndEvidence}
                    </p>
                  </div>
                </details>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-accent-tint px-3 py-1">27 account records</span>
                <span className="rounded-full bg-accent-tint px-3 py-1">4 researched firms</span>
                <span className="rounded-full bg-accent-tint px-3 py-1">Rules checked 29 Oct 2026</span>
              </div>
            </div>

            {/* SECTION 2: Detailed Rule-by-Rule Breakdown (A / B / C / D Framework) */}
            {inspectedAccount && report.ruleBreakdowns.length > 0 && (
              <div id="rule-breakdown" className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Rule-by-Rule Specialist Breakdown (A / B / C / D)
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-ink">
                      How {inspectedAccount.firmName} · {inspectedAccount.programmeName} actually operates
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {(["all", "elevated", "verified"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        aria-pressed={ruleFilter === tab}
                        onClick={() => setRuleFilter(tab)}
                        className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                          ruleFilter === tab
                            ? "bg-accent text-white"
                            : "border border-stroke bg-soft text-body hover:border-accent-line"
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

                <div className="mt-4 space-y-2">
                  {!filteredRuleBreakdowns.length && (
                    <p className="py-4 text-sm text-muted">
                      No rules match this filter. Choose All to see the full breakdown.
                    </p>
                  )}
                  {filteredRuleBreakdowns.map((rule, index) => {
                    const badgeColor =
                      rule.riskLevel === "elevated"
                        ? "border-rose-200 bg-rose-100 text-rose-800"
                        : rule.riskLevel === "moderate"
                          ? "border-amber-200 bg-amber-100 text-amber-800"
                          : rule.riskLevel === "unverified"
                            ? "border-accent-line bg-accent-tint text-body"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800";

                    return (
                      <details
                        key={`${inspectedAccount.id}-${rule.id}`}
                        open={index === 0}
                        className="report-disclosure rounded-xl border border-line bg-soft p-4"
                      >
                        <summary>
                          <span className="font-semibold text-ink">{rule.title}</span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
                          >
                            {rule.riskLevel === "elevated"
                              ? "Elevated risk"
                              : rule.riskLevel === "moderate"
                                ? "Needs management"
                                : rule.riskLevel === "unverified"
                                  ? "Unverified"
                                  : "Compatible"}
                          </span>
                          <ChevronDown size={15} />
                        </summary>
                        {rule.sourceUrl && (
                          <a
                            href={rule.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-xs text-accent underline"
                          >
                            Official source · {rule.verifiedAt}
                          </a>
                        )}

                        <div className="mt-4 grid gap-3 text-xs leading-5 sm:grid-cols-2">
                          <div className="rounded-lg border border-line bg-panel p-3">
                            <p className="font-bold uppercase tracking-wide text-body">
                              A. What the rule says
                            </p>
                            <p className="mt-1 text-body">{rule.whatTheRuleSays}</p>
                          </div>
                          <div className="rounded-lg border border-line bg-panel p-3">
                            <p className="font-bold uppercase tracking-wide text-accent">
                              B. What the rule means in practice
                            </p>
                            <p className="mt-1 text-body">{rule.whatItMeansInPractice}</p>
                          </div>
                          <div className="rounded-lg border border-line bg-panel p-3">
                            <p className="font-bold uppercase tracking-wide text-amber-800">
                              C. What it means for this trader
                            </p>
                            <p className="mt-1 text-body">{rule.whatItMeansForYou}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                            <p className="font-bold uppercase tracking-wide text-emerald-800">
                              D. How to manage the restriction
                            </p>
                            <p className="mt-1 text-body">{rule.howToManageIt}</p>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: Personalised Risk & Rule-Management Scenario Simulator */}
            <div id="risk-scenarios" className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Personalised Risk &amp; Rule-Management Guidance
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">
                    Stress-testing your sizing &amp; trade history against programme limits
                  </h3>
                </div>

                {/* Interactive Risk-Per-Trade Stress-Tester */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-soft p-1.5 text-xs">
                  <span className="px-2 text-muted">Simulate Risk/Trade:</span>
                  {[0.25, 0.5, 0.75, 1.0, 1.5].map((pct) => {
                    const activeRisk = simulatedRiskPct ?? profile.riskPerTradePct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        aria-pressed={activeRisk === pct}
                        onClick={() => setSimulatedRiskPct(pct)}
                        className={`rounded-lg px-2 py-1 font-semibold tabular-nums transition ${
                          activeRisk === pct ? "bg-accent text-white" : "text-body hover:bg-accent-tint"
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase text-accent">Daily Loss Buffer Analysis</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        report.riskAndScenarioAnalysis.dailyLossBuffer.status === "comfortable"
                          ? "bg-emerald-100 text-emerald-800"
                          : report.riskAndScenarioAnalysis.dailyLossBuffer.status === "tight"
                            ? "bg-amber-100 text-amber-800"
                            : report.riskAndScenarioAnalysis.dailyLossBuffer.status === "breach_risk"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-accent-tint text-muted"
                      }`}
                    >
                      {report.riskAndScenarioAnalysis.dailyLossBuffer.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-body">
                    {report.riskAndScenarioAnalysis.dailyLossBuffer.explanation}
                  </p>
                  <p className="mt-2.5 rounded-lg border border-accent-line bg-accent-tint p-2.5 text-xs font-medium text-accent">
                    {report.riskAndScenarioAnalysis.dailyLossBuffer.recommendedDailyStopProtocol}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-soft p-4">
                  <p className="text-xs font-bold uppercase text-accent">Overall Drawdown Cushion</p>
                  <p className="mt-2.5 text-xs leading-5 text-body">
                    {report.riskAndScenarioAnalysis.overallDrawdownBuffer.explanation}
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase text-accent">
                    Consistency &amp; Profit Concentration Check
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-body">
                    {report.riskAndScenarioAnalysis.consistencyCheck.explanation}
                  </p>
                </div>
              </div>

              {/* Purchase Readiness Verdict */}
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  report.riskAndScenarioAnalysis.purchaseReadinessVerdict.readyToPurchaseNow ===
                  "yes_with_discipline"
                    ? "border-emerald-200 bg-emerald-50"
                    : report.riskAndScenarioAnalysis.purchaseReadinessVerdict.readyToPurchaseNow ===
                        "caution_refine_first"
                      ? "border-amber-200 bg-amber-50"
                      : "border-rose-200 bg-rose-50"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-ink">
                  Whether Purchasing This Account Makes Sense Right Now
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {report.riskAndScenarioAnalysis.purchaseReadinessVerdict.headline}
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-body">
                  {report.riskAndScenarioAnalysis.purchaseReadinessVerdict.rationale.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* SECTION 4: Price, Fee Efficiency & Financial Trade-Offs */}
            <div id="pricing-tradeoffs" className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Price &amp; Financial Trade-Off Analysis
              </p>
              <h3 className="mt-1 text-xl font-bold text-ink">
                What the evaluation costs and what you are actually paying for
              </h3>

              <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-soft p-4">
                  <p className="text-muted">Entry Fee &amp; Capital</p>
                  <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                    {report.financialTradeOffAnalysis.entryPriceFormatted}{" "}
                    <span className="text-xs font-normal text-muted">
                      for {report.financialTradeOffAnalysis.simulatedCapitalFormatted}
                    </span>
                  </p>
                  {report.financialTradeOffAnalysis.basePriceFormatted && (
                    <p className="mt-1 text-amber-800">
                      Promotional offer · Standard fee {report.financialTradeOffAnalysis.basePriceFormatted}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-line bg-soft p-4">
                  <p className="text-muted">True Risk Capital (Max Drawdown Room)</p>
                  <p className="mt-1 text-lg font-bold text-accent tabular-nums">
                    {report.financialTradeOffAnalysis.maxDrawdownRoomAmount !== null
                      ? `$${report.financialTradeOffAnalysis.maxDrawdownRoomAmount.toLocaleString("en-US")}`
                      : "Unverified"}
                  </p>
                  <p className="mt-1 text-muted">
                    {report.financialTradeOffAnalysis.costPerThousandDrawdownRoom !== null
                      ? `${report.financialTradeOffAnalysis.costPerThousandDrawdownRoom.toFixed(2)} per $1,000 of drawdown room`
                      : "Fee efficiency unverified"}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-soft p-4">
                  <p className="text-muted">Refund &amp; Recurring Fee Policy</p>
                  <p className="mt-1 text-body">{report.financialTradeOffAnalysis.refundPolicy}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3.5 text-xs leading-5 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-soft p-4">
                  <p className="font-bold text-ink">Cheapest vs. Best-Fit Assessment</p>
                  <p className="mt-1 text-body">
                    {report.financialTradeOffAnalysis.cheapestVsBestFitVerdict}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="font-bold text-rose-800">Financial Downside If Breached</p>
                  <p className="mt-1 text-body">
                    {report.financialTradeOffAnalysis.financialDownsideIfBreached}
                  </p>
                </div>
              </div>

              {report.financialTradeOffAnalysis.comparisonRows.length > 0 && (
                <div
                  role="region"
                  aria-label="Account cost comparison"
                  tabIndex={0}
                  className="mt-5 overflow-x-auto rounded-xl border border-line"
                >
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-soft text-muted">
                      <tr>
                        <th className="p-3">Programme</th>
                        <th className="p-3">Entry Fee</th>
                        <th className="p-3">Max Drawdown ($)</th>
                        <th className="p-3">Cost / $1K Drawdown</th>
                        <th className="p-3">Refund Policy</th>
                        <th className="p-3">Trade-Off Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-panel">
                      {report.financialTradeOffAnalysis.comparisonRows.map((row) => (
                        <tr key={row.accountId} className={row.isRecommended ? "bg-accent-tint" : undefined}>
                          <td className="p-3 font-semibold text-ink">
                            {row.firmName} · {row.programmeName}
                          </td>
                          <td className="p-3 tabular-nums text-body">
                            {row.entryPrice !== null
                              ? currency(row.entryPrice, row.priceCurrency)
                              : "Unverified"}
                          </td>
                          <td className="p-3 tabular-nums text-body">
                            {row.maxDrawdownDollar !== null
                              ? `$${row.maxDrawdownDollar.toLocaleString("en-US")}`
                              : "—"}
                          </td>
                          <td className="p-3 tabular-nums text-accent">
                            {row.costPer1kDrawdown !== null
                              ? currency(row.costPer1kDrawdown, row.priceCurrency)
                              : "—"}
                          </td>
                          <td className="p-3 text-body">{row.refundSummary}</td>
                          <td className="p-3 text-body">{row.tradeOffNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 5: Why Other Accounts Rank Lower */}
            {report.alternativesAnalysis.length > 0 && (
              <div id="alternatives-section" className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Comparative Alternative Analysis
                </p>
                <h3 className="mt-1 text-xl font-bold text-ink">
                  Why alternative accounts rank lower for your specific profile
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {report.alternativesAnalysis.map((alt) => (
                    <article
                      key={alt.account.id}
                      className="flex flex-col justify-between rounded-xl border border-line bg-soft p-4 text-xs leading-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-accent">{alt.account.firmName}</p>
                            <h4 className="text-sm font-bold text-ink">{alt.account.programmeName}</h4>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              alt.disadvantageSeverity === "deal_breaker"
                                ? "bg-rose-100 text-rose-800"
                                : alt.disadvantageSeverity === "evidence_gap"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-accent-tint text-body"
                            }`}
                          >
                            {alt.disadvantageSeverity.replace(/_/g, " ")}
                          </span>
                        </div>

                        <p className="mt-2.5 text-body">
                          <strong className="text-ink">What makes it attractive:</strong>{" "}
                          {alt.whatMakesItAttractive}
                        </p>
                        <p className="mt-2 text-body">
                          <strong className="text-rose-800">Why it ranks lower:</strong> {alt.whyItRanksLower}
                        </p>
                        <p className="mt-2 text-body">
                          <strong className="text-emerald-800">When to reconsider:</strong>{" "}
                          {alt.whenToReconsider}
                        </p>
                      </div>

                      <div className="mt-3 border-t border-line pt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectedAccountId(alt.account.id);
                            requestAnimationFrame(() =>
                              document.getElementById("rule-breakdown")?.scrollIntoView(),
                            );
                          }}
                          className="font-semibold text-accent hover:underline"
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
              <div id="evidence-audit" className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Research Evidence &amp; Verification Dates
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-ink">
                      Official documentation backing this recommendation
                    </h3>
                  </div>
                  <span className="rounded-lg border border-stroke bg-soft px-3 py-1 text-xs font-mono text-body">
                    Snapshot: {report.evidenceAuditLog.researchSnapshotDate} ·{" "}
                    {report.evidenceAuditLog.verifiedCount}/{report.evidenceAuditLog.totalRulesChecked} Rules
                    Verified
                  </span>
                </div>

                {report.evidenceAuditLog.unresolvedConflictsAndGaps.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5">
                    <p className="font-bold text-amber-800">
                      Disclosed Phase Distinctions &amp; Unresolved Documentation Notes
                    </p>
                    <ul className="mt-1.5 space-y-1 text-body">
                      {report.evidenceAuditLog.unresolvedConflictsAndGaps.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  role="region"
                  aria-label="Rule evidence table"
                  tabIndex={0}
                  className="mt-4 overflow-x-auto rounded-xl border border-line"
                >
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-soft text-muted">
                      <tr>
                        <th className="p-3">Rule Checkpoint</th>
                        <th className="p-3">Extracted Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Official Source &amp; Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-panel">
                      {report.evidenceAuditLog.entries.map((entry) => (
                        <tr key={entry.ruleLabel}>
                          <td className="p-3 font-medium text-ink">{entry.ruleLabel}</td>
                          <td className="p-3 text-body">
                            {entry.valueSummary}
                            {entry.operationalNote && (
                              <span className="mt-0.5 block text-[11px] text-muted">
                                {entry.operationalNote}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                entry.status === "verified"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
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
                                className="text-accent underline"
                              >
                                Official source ({entry.verifiedAt})
                              </a>
                            ) : (
                              <span className="text-muted">Not confirmed in official docs</span>
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
            <div className="rounded-2xl border border-accent-line bg-accent-tint p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Final Decision Summary
              </p>
              <h3 className="mt-1 text-lg font-bold text-ink">
                {report.finalDecisionSummary.recommendationHeadline}
              </h3>
              <div className="mt-4 grid gap-4 text-xs leading-5 sm:grid-cols-3">
                <div>
                  <p className="font-bold text-emerald-800">Why Choose This Account</p>
                  <ul className="mt-1.5 space-y-1 text-body">
                    {report.finalDecisionSummary.keyReasonsToChoose.map((r) => (
                      <li key={r}>✓ {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-amber-800">Critical Risks to Respect</p>
                  <ul className="mt-1.5 space-y-1 text-body">
                    {report.finalDecisionSummary.criticalRisksToRespect.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-accent">Pre-Purchase Verification Checklist</p>
                  <ul className="mt-1.5 space-y-1 text-body">
                    {report.finalDecisionSummary.prePurchaseChecklist.map((c) => (
                      <li key={c}>☐ {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 8: All Compatible & Excluded Account Cards */}
            <div id="catalogue-matches" className="space-y-4">
              <h3 className="text-lg font-bold text-ink">All Compatible Programmes ({eligible.length})</h3>

              {eligible.length === 0 && (
                <div className="rounded-2xl border border-amber-200 p-5 text-sm leading-6 text-amber-800">
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
                    className={`rounded-2xl border bg-panel p-5 sm:p-6 ${
                      primary ? "border-accent-line" : "border-line"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-accent">{account.firmName}</p>
                        <h3 className="mt-1 text-xl font-semibold">{account.programmeName}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {currency(account.accountSize, "USD")} account · {priceLabel}
                          {account.basePrice?.status === "verified" &&
                          account.basePrice.value !== account.price.value &&
                          account.basePrice.value !== null
                            ? ` (standard ${currency(account.basePrice.value, account.priceCurrency)})`
                            : ""}
                        </p>
                      </div>
                      <div className="rounded-xl bg-accent-tint px-3 py-2 text-right">
                        <p className="text-2xl font-bold text-ink tabular-nums">
                          {item.score === null ? "—" : `${item.score}%`}
                        </p>
                        <p className="text-xs text-muted">
                          compatibility · {item.scoreCoveragePct}% criteria covered
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {primary && (
                        <p className="inline-flex rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
                          {decision.isPurchaseRecommendation
                            ? "Best documented fit"
                            : "Preliminary candidate · evidence missing"}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setInspectedAccountId(account.id);
                          requestAnimationFrame(() =>
                            document.getElementById("rule-breakdown")?.scrollIntoView(),
                          );
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isCurrentlyInspected
                            ? "bg-emerald-100 text-emerald-800"
                            : "border border-stroke bg-soft text-body hover:border-accent hover:text-accent"
                        }`}
                      >
                        {isCurrentlyInspected
                          ? "✓ Currently shown in Rule Breakdown above"
                          : "Inspect Rule-by-Rule Breakdown ↑"}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-soft p-4">
                        <p className="text-xs font-semibold uppercase text-muted">Key rules</p>
                        <p className="mt-2 text-sm text-body">
                          {account.evaluationPhases.status === "verified"
                            ? `${account.evaluationPhases.value ?? "?"} evaluation phase(s)`
                            : "Phase count unverified"}{" "}
                          · target{" "}
                          {account.profitTargetsPct.status === "verified"
                            ? `${(account.profitTargetsPct.value ?? []).join("% / ")}%`
                            : "unverified"}
                        </p>
                        <p className="mt-1 text-sm text-body">
                          Daily loss{" "}
                          {account.dailyLossLimitPct.status === "verified"
                            ? `${account.dailyLossLimitPct.value}%`
                            : "unknown"}{" "}
                          · overall loss{" "}
                          {account.overallLossLimitPct.status === "verified"
                            ? `${account.overallLossLimitPct.value}%`
                            : "unknown"}
                        </p>
                        <p className="mt-1 text-sm text-body">
                          Drawdown{" "}
                          {account.drawdownType.status === "verified"
                            ? account.drawdownType.value
                            : "unverified"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-soft p-4">
                        <p className="text-xs font-semibold uppercase text-muted">Why it appears</p>
                        {item.reasons.length ? (
                          <ul className="mt-2 space-y-1 text-sm text-body">
                            {item.reasons.slice(0, 3).map((reason) => (
                              <li key={reason}>✓ {reason}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-muted">
                            No scored criteria have been confirmed yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {item.historyObservations.length > 0 && (
                      <div className="mt-3 rounded-xl border border-accent-line bg-accent-tint p-4">
                        <p className="text-xs font-semibold uppercase text-accent">
                          From your imported history
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-body">
                          {item.historyObservations.map((observation) => (
                            <li key={observation}>{observation}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(item.warnings.length > 0 || item.missingDecisionEvidence.length > 0) && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase text-amber-800">Unknowns to review</p>
                        <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-800">
                          {[
                            ...new Set([
                              ...item.missingDecisionEvidence.map(
                                (value) => `Evidence not confirmed: ${value}.`,
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

                    <details className="mt-4 rounded-xl border border-line p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-body">
                        Sources and rule evidence ({ruleSources.length} links)
                      </summary>
                      <ul className="mt-3 space-y-2">
                        {ruleSources.map((rule, index) => (
                          <li key={`${rule.sourceUrl}-${index}`} className="text-sm">
                            <a
                              className="break-all text-accent underline"
                              href={rule.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Official firm source
                            </a>
                            <span className="ml-2 text-xs text-muted">verified {rule.verifiedAt}</span>
                            {rule.note && <p className="mt-1 text-xs leading-5 text-muted">{rule.note}</p>}
                          </li>
                        ))}
                        {ruleSources.length === 0 && (
                          <li className="text-sm text-muted">
                            No verified source links are recorded for the selected rules.
                          </li>
                        )}
                      </ul>
                      <p className="mt-3 text-xs text-muted">
                        Always confirm current prices and terms on the firm website before paying. Promotions
                        and rules can change.
                      </p>
                    </details>
                  </article>
                );
              })}

              {excluded.length > 0 && (
                <div className="rounded-2xl border border-line bg-panel p-5">
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
                        <li key={item.account.id} className="border-t border-line pt-4">
                          <p className="font-medium">
                            {item.account.firmName} · {item.account.programmeName}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-rose-800">
                            {item.reasons.map((reason) => (
                              <li key={reason}>• {reason}</li>
                            ))}
                          </ul>
                          {item.warnings.length > 0 && (
                            <p className="mt-2 text-xs leading-5 text-amber-800">
                              Unconfirmed: {item.warnings.join(" ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="text-xs leading-5 text-muted">
                No live rule monitoring is connected. Research snapshot date: 29 October 2026. Review the
                linked official terms before payment.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
