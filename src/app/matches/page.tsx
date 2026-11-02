"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { firmAccounts } from "@/data/firms";
import { assessAccount, decidePrimaryRecommendation } from "@/lib/matching/advisory";
import type { TraderProfile, TradingStyle } from "@/lib/matching/types";
import type { TradeHistorySummary } from "@/lib/trading-history/types";

const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400";
const initialProfile: TraderProfile = {
  tradingStyle: "intraday", strategyDescription: "", tradesPerWeek: 5, requiresWeekendHolding: false,
  preferredDrawdown: "either", maxBudget: 100, budgetCurrency: "USD", minimumAccountSize: 10_000,
  avoidsConsistencyRules: false, tradesNews: false, usesAutomation: false, marketsTraded: "Forex",
  riskPerTradePct: null,
};
const currency = (amount: number, code: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);
const styles: Array<{ value: TradingStyle; label: string }> = [
  { value: "scalping", label: "Scalping" }, { value: "intraday", label: "Day trading" },
  { value: "swing", label: "Swing trading" }, { value: "news", label: "News trading" },
];
const subscribeHistory = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("propfirm-history-summary-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("propfirm-history-summary-change", callback);
  };
};
const getHistorySnapshot = () => {
  try { return localStorage.getItem("propfirm-history-summary"); } catch { return null; }
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
    try { return JSON.parse(historySnapshot) as TradeHistorySummary; } catch { return null; }
  }, [historySnapshot]);
  const historyPrompt = useSyncExternalStore(subscribeLocation, getHistoryIntent, () => false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const assessments = useMemo(() => hasSearched
    ? firmAccounts.map((account) => assessAccount(profile, account, history))
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || (b.score ?? -1) - (a.score ?? -1) || a.account.accountSize - b.account.accountSize)
    : [], [hasSearched, profile, history]);
  const decision = useMemo(() => decidePrimaryRecommendation(assessments), [assessments]);
  const eligible = assessments.filter((item) => item.eligible);
  const excluded = assessments.filter((item) => !item.eligible);

  function update<K extends keyof TraderProfile>(key: K, value: TraderProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function startSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-9 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <Link href="/" className="text-sm text-cyan-300 hover:underline">PropFirm Intelligence</Link>
        <p className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Research-backed account search</p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Find programmes that fit how you trade.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-400">Set your strategy and account preferences, then compare researched account sizes against documented rules. Unknown rules stay visible and can prevent a purchase recommendation.</p>
      </header>

      {historyPrompt && <div role="status" className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
        <h2 className="font-semibold text-cyan-100">Trading history is ready to inform your search</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Review the profile below and choose <strong>Search prop firms</strong>. Your closed-trade summary can add context to the results; it does not simulate every firm rule or predict a pass.</p>
        {!history && <p className="mt-2 text-sm text-amber-200">No saved history summary was found in this browser. You can still search, or <Link className="underline" href="/history">import your CSV again</Link>.</p>}
      </div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={startSearch} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <div><p className="text-sm font-semibold text-cyan-300">Your profile</p><h2 className="mt-1 text-2xl font-semibold">What should a good fit look like?</h2></div>
          <label className="mt-6 block text-sm text-slate-300">Trading style<select className={inputClass} value={profile.tradingStyle} onChange={(e) => update("tradingStyle", e.target.value as TradingStyle)}>{styles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label>
          <label className="mt-4 block text-sm text-slate-300">Describe your strategy (optional)<textarea className={inputClass} rows={3} value={profile.strategyDescription} onChange={(e) => update("strategyDescription", e.target.value)} placeholder="For example: EUR/USD intraday, usually flat before rollover." /></label>
          <label className="mt-4 block text-sm text-slate-300">Markets you trade<input className={inputClass} value={profile.marketsTraded} onChange={(e) => update("marketsTraded", e.target.value)} placeholder="Forex, indices, metals…" /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">Trades per week<input className={inputClass} type="number" min="0" max="1000" value={profile.tradesPerWeek} onChange={(e) => update("tradesPerWeek", Number(e.target.value))} /></label>
            <label className="block text-sm text-slate-300">Preferred drawdown<select className={inputClass} value={profile.preferredDrawdown} onChange={(e) => update("preferredDrawdown", e.target.value as TraderProfile["preferredDrawdown"])}><option value="either">No preference</option><option value="static">Static</option><option value="trailing">Trailing</option></select></label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">Maximum entry budget<input className={inputClass} type="number" min="0" step="0.01" value={profile.maxBudget} onChange={(e) => update("maxBudget", Number(e.target.value))} /></label>
            <label className="block text-sm text-slate-300">Budget currency<select className={inputClass} value={profile.budgetCurrency} onChange={(e) => update("budgetCurrency", e.target.value as TraderProfile["budgetCurrency"])}><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
          </div>
          <label className="mt-4 block text-sm text-slate-300">Minimum account size (USD)<select className={inputClass} value={profile.minimumAccountSize} onChange={(e) => update("minimumAccountSize", Number(e.target.value))}>{[0, 2500, 5000, 10000, 25000, 50000, 100000, 200000].map((size) => <option key={size} value={size}>{size === 0 ? "No minimum" : currency(size, "USD")}</option>)}</select></label>
          <fieldset className="mt-6 space-y-3 text-sm text-slate-300"><legend className="mb-3 font-semibold text-white">Strategy requirements</legend>
            <label className="flex gap-3"><input type="checkbox" checked={profile.requiresWeekendHolding} onChange={(e) => update("requiresWeekendHolding", e.target.checked)} /> I need to hold positions over weekends</label>
            <label className="flex gap-3"><input type="checkbox" checked={profile.tradesNews} onChange={(e) => update("tradesNews", e.target.checked)} /> My strategy trades around news events</label>
            <label className="flex gap-3"><input type="checkbox" checked={profile.usesAutomation} onChange={(e) => update("usesAutomation", e.target.checked)} /> I use an EA or other automation</label>
            <label className="flex gap-3"><input type="checkbox" checked={profile.avoidsConsistencyRules} onChange={(e) => update("avoidsConsistencyRules", e.target.checked)} /> I want to avoid consistency rules</label>
          </fieldset>
          <details className="mt-5 rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-200">Optional risk detail for a history scenario</summary><label className="mt-4 block text-sm text-slate-300">Risk per trade (%)<input className={inputClass} type="number" min="0" max="100" step="0.01" placeholder="Leave blank if unknown" value={profile.riskPerTradePct ?? ""} onChange={(e) => update("riskPerTradePct", e.target.value === "" ? null : Number(e.target.value))} /></label><p className="mt-2 text-xs leading-5 text-slate-500">Used only for a clearly labelled losing-streak illustration when history is available.</p></details>
          <button type="submit" className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300">Search prop firms</button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Compatibility scores are deterministic comparisons, not probabilities of passing or receiving payouts. Prices are compared only in the currency you select.</p>
        </form>

        <section aria-live="polite" className="space-y-5">
          {!hasSearched ? <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-7 sm:p-9"><p className="text-sm font-semibold text-cyan-300">27 researched account options · 4 firms</p><h2 className="mt-3 text-2xl font-semibold">Your matches will appear here</h2><p className="mt-3 leading-7 text-slate-400">The catalogue includes multiple programme types and sizes up to $200,000. Search to see compatible options, documented conflicts, verified rule coverage, sources, and current unknowns.</p><Link href="/history" className="mt-5 inline-flex text-sm font-semibold text-cyan-300 hover:underline">Analyze trading history first →</Link></div> : <>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Search summary</p>
              <h2 className="mt-2 text-xl font-semibold">{eligible.length} compatible options · {excluded.length} excluded</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{decision.message}</p>
              {!decision.isPurchaseRecommendation && <p className="mt-3 rounded-xl bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">A high compatibility score does not clear missing evidence. Check the unknowns and open the official rules before deciding.</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400"><span className="rounded-full bg-slate-800 px-3 py-1">27 account records</span><span className="rounded-full bg-slate-800 px-3 py-1">4 researched firms</span><span className="rounded-full bg-slate-800 px-3 py-1">Rules checked 29 Oct 2026</span></div>
            </div>
            {eligible.length === 0 && <div className="rounded-2xl border border-amber-400/30 p-5 text-sm leading-6 text-amber-100">No account passed the documented hard checks. Review excluded options below, or adjust your profile only if your actual requirements allow it.</div>}
            {eligible.map((item) => {
              const account = item.account;
              const primary = decision.account?.id === account.id;
              const priceLabel = account.price.status === "verified" && account.price.value !== null ? currency(account.price.value, account.priceCurrency) : "Price not verified";
              const ruleSources = [account.price, account.profitTargetsPct, account.dailyLossLimitPct, account.overallLossLimitPct, account.drawdownType, account.weekendRule, account.payoutTerms].filter((rule) => rule.status === "verified" && rule.sourceUrl);
              return <article key={account.id} className={`rounded-2xl border bg-slate-900/50 p-5 sm:p-6 ${primary ? "border-cyan-400/60" : "border-slate-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-cyan-300">{account.firmName}</p><h3 className="mt-1 text-xl font-semibold">{account.programmeName}</h3><p className="mt-1 text-sm text-slate-400">{currency(account.accountSize, "USD")} account · {priceLabel}{account.basePrice?.status === "verified" && account.basePrice.value !== account.price.value && account.basePrice.value !== null ? ` (standard ${currency(account.basePrice.value, account.priceCurrency)})` : ""}</p></div><div className="rounded-xl bg-slate-800 px-3 py-2 text-right"><p className="text-2xl font-bold text-white">{item.score === null ? "—" : `${item.score}%`}</p><p className="text-xs text-slate-400">compatibility · {item.scoreCoveragePct}% criteria covered</p></div></div>
                {primary && <p className="mt-4 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">{decision.isPurchaseRecommendation ? "Best documented fit" : "Preliminary candidate · evidence missing"}</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Key rules</p><p className="mt-2 text-sm text-slate-200">{account.evaluationPhases.status === "verified" ? `${account.evaluationPhases.value ?? "?"} evaluation phase(s)` : "Phase count unverified"} · target {account.profitTargetsPct.status === "verified" ? `${(account.profitTargetsPct.value ?? []).join("% / ")}%` : "unverified"}</p><p className="mt-1 text-sm text-slate-300">Daily loss {account.dailyLossLimitPct.status === "verified" ? `${account.dailyLossLimitPct.value}%` : "unknown"} · overall loss {account.overallLossLimitPct.status === "verified" ? `${account.overallLossLimitPct.value}%` : "unknown"}</p><p className="mt-1 text-sm text-slate-300">Drawdown {account.drawdownType.status === "verified" ? account.drawdownType.value : "unverified"}</p></div><div className="rounded-xl bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Why it appears</p>{item.reasons.length ? <ul className="mt-2 space-y-1 text-sm text-slate-200">{item.reasons.slice(0, 3).map((reason) => <li key={reason}>✓ {reason}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No scored criteria have been confirmed yet.</p>}</div></div>
                {item.historyObservations.length > 0 && <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4"><p className="text-xs font-semibold uppercase text-cyan-200">From your imported history</p><ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">{item.historyObservations.map((observation) => <li key={observation}>{observation}</li>)}</ul></div>}
                {(item.warnings.length > 0 || item.missingDecisionEvidence.length > 0) && <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-xs font-semibold uppercase text-amber-200">Unknowns to review</p><ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50">{[...new Set([...item.missingDecisionEvidence.map((value) => `Evidence not confirmed: ${value}.`), ...item.warnings])].slice(0, 6).map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
                <details className="mt-4 rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-200">Sources and rule evidence ({ruleSources.length} links)</summary><ul className="mt-3 space-y-2">{ruleSources.map((rule, index) => <li key={`${rule.sourceUrl}-${index}`} className="text-sm"><a className="break-all text-cyan-300 underline" href={rule.sourceUrl} target="_blank" rel="noreferrer">Official firm source</a><span className="ml-2 text-xs text-slate-500">verified {rule.verifiedAt}</span>{rule.note && <p className="mt-1 text-xs leading-5 text-slate-400">{rule.note}</p>}</li>)}{ruleSources.length === 0 && <li className="text-sm text-slate-400">No verified source links are recorded for the selected rules.</li>}</ul><p className="mt-3 text-xs text-slate-500">Always confirm current prices and terms on the firm website before paying. Promotions and rules can change.</p></details>
              </article>;
            })}
            {excluded.length > 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><button type="button" className="flex w-full items-center justify-between text-left font-semibold" onClick={() => setShowExcluded((value) => !value)} aria-expanded={showExcluded}><span>Excluded by documented profile conflicts ({excluded.length})</span><span>{showExcluded ? "−" : "+"}</span></button>{showExcluded && <ul className="mt-4 space-y-4">{excluded.map((item) => <li key={item.account.id} className="border-t border-slate-800 pt-4"><p className="font-medium">{item.account.firmName} · {item.account.programmeName}</p><ul className="mt-2 space-y-1 text-sm text-rose-200">{item.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>{item.warnings.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-200">Unconfirmed: {item.warnings.join(" ")}</p>}</li>)}</ul>}</div>}
            <p className="text-xs leading-5 text-slate-500">No live rule monitoring is connected. Research snapshot date: 29 October 2026. Review the linked official terms before payment.</p>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
