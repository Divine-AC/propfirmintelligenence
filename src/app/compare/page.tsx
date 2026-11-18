"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { firmAccounts } from "@/data/firms";

const currency = (amount: number, code: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);

const DEFAULT_SELECTED = [
  "ftmo-2-step-10k",
  "ftmo-1-step-10k",
  "fundednext-stellar-2-step-15k",
  "brightfunded-2-step-bright-10k",
];

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED);
  const [firmFilter, setFirmFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<number>(0);

  const firms = useMemo(() => ["all", ...new Set(firmAccounts.map((a) => a.firmName))], []);
  const sizes = useMemo(
    () => [0, ...[...new Set(firmAccounts.map((a) => a.accountSize))].sort((a, b) => a - b)],
    []
  );

  const filteredCatalogue = useMemo(() => {
    return firmAccounts.filter((acc) => {
      if (firmFilter !== "all" && acc.firmName !== firmFilter) return false;
      if (sizeFilter > 0 && acc.accountSize !== sizeFilter) return false;
      return true;
    });
  }, [firmFilter, sizeFilter]);

  const selectedAccounts = useMemo(
    () => selectedIds.map((id) => firmAccounts.find((a) => a.id === id)).filter((a) => a !== undefined),
    [selectedIds]
  );

  function toggleAccount(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  return (
    <main className="min-h-screen px-4 py-9 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Side-by-Side Programme Rule Matrix
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Compare operational rules across 27 account options.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Select up to 4 programmes below to inspect their verified loss calculations, daily reset mechanics,
              phase-to-funded transitions, consistency rules, and true cost per $1,000 of usable drawdown room.
            </p>
          </div>
          <Link
            href="/matches"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Run Personalised Consultation →
          </Link>
        </header>

        {/* Catalogue Selector & Filters */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Firm:</span>
              {firms.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFirmFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    firmFilter === f
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {f === "all" ? "All Firms" : f}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Size:</span>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "All Sizes" : `$${s.toLocaleString("en-US")}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredCatalogue.map((acc) => {
              const active = selectedIds.includes(acc.id);
              const priceLabel =
                acc.price.status === "verified" && acc.price.value !== null
                  ? currency(acc.price.value, acc.priceCurrency)
                  : "Fee unverified";
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccount(acc.id)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-400 bg-cyan-400/15 ring-1 ring-cyan-400/30"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-600"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-cyan-300">{acc.firmName}</span>
                      <span className="font-mono text-slate-400">{priceLabel}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-white">{acc.programmeName}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {acc.dailyLossLimitPct.value ?? "?"}% daily · {acc.overallLossLimitPct.value ?? "?"}%{" "}
                      {acc.drawdownType.value}
                    </span>
                    <span className={active ? "font-bold text-cyan-200" : "text-slate-500"}>
                      {active ? "Selected ✓" : "+ Compare"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Side-by-Side Comparison Table */}
        <section className="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
          <table className="w-full min-w-[860px] text-left text-xs leading-5">
            <thead className="border-b border-slate-800 bg-slate-950/95">
              <tr>
                <th className="w-48 p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rule &amp; Parameter
                </th>
                {selectedAccounts.map((acc) => (
                  <th key={acc.id} className="p-4 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-cyan-300">{acc.firmName}</p>
                        <p className="mt-0.5 text-sm font-bold text-white">{acc.programmeName}</p>
                      </div>
                      {selectedAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleAccount(acc.id)}
                          className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="Remove from comparison"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              <tr>
                <td className="p-4 font-semibold text-slate-300">Account Allocation</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 font-bold text-white tabular-nums">
                    ${acc.accountSize.toLocaleString("en-US")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Verified Entry Fee</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 tabular-nums">
                    {acc.price.status === "verified" && acc.price.value !== null ? (
                      <div>
                        <span className="text-sm font-bold text-emerald-300">
                          {currency(acc.price.value, acc.priceCurrency)}
                        </span>
                        {acc.basePrice?.value && acc.basePrice.value !== acc.price.value && (
                          <span className="ml-1.5 text-slate-400 line-through">
                            {currency(acc.basePrice.value, acc.priceCurrency)}
                          </span>
                        )}
                        {acc.price.note && <p className="mt-1 text-[11px] text-slate-400">{acc.price.note}</p>}
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-amber-300">Unverified Fee</span>
                        {acc.price.note && <p className="mt-1 text-[11px] text-slate-400">{acc.price.note}</p>}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">
                  True Drawdown Capital &amp; Cost per $1K Drawdown
                </td>
                {selectedAccounts.map((acc) => {
                  const dd =
                    acc.overallLossLimitPct.value !== null
                      ? (acc.accountSize * acc.overallLossLimitPct.value) / 100
                      : null;
                  const costPer1k =
                    acc.price.value !== null && dd && dd > 0 ? (acc.price.value / dd) * 1000 : null;
                  return (
                    <td key={acc.id} className="p-4 tabular-nums">
                      <p className="font-semibold text-white">
                        {dd !== null ? `$${dd.toLocaleString("en-US")} max loss room` : "Unverified"}
                      </p>
                      <p className="text-cyan-300">
                        {costPer1k !== null
                          ? `${currency(costPer1k, acc.priceCurrency)} per $1,000 drawdown`
                          : "Cost ratio unverified"}
                      </p>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Evaluation Phases &amp; Targets</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    {acc.evaluationPhases.value ?? "?"} Phase(s) · Targets:{" "}
                    <strong>{(acc.profitTargetsPct.value ?? []).map((t) => `${t}%`).join(" → ")}</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Daily Loss Limit &amp; Reset</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-bold text-white">
                      {acc.dailyLossLimitPct.value ?? "?"}% ($
                      {acc.dailyLossLimitPct.value !== null
                        ? ((acc.accountSize * acc.dailyLossLimitPct.value) / 100).toLocaleString("en-US")
                        : "?"}
                      )
                    </p>
                    <p className="mt-1 text-slate-400">Reset: {acc.dailyReset.value ?? "Unverified"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Overall Loss &amp; Drawdown Model</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-bold uppercase ${
                        acc.drawdownType.value === "static"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-400/15 text-amber-200"
                      }`}
                    >
                      {acc.overallLossLimitPct.value ?? "?"}% · {acc.drawdownType.value}
                    </span>
                    <p className="mt-1.5 text-slate-300">{acc.lossCalculation.value}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Min Trading Days &amp; Time Limit</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p>{acc.minimumTradingDays.value ?? "Unverified"}</p>
                    <p className="mt-1 text-slate-400">Time limit: {acc.timeLimit.value ?? "Unverified"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Overnight &amp; Weekend Holding</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-semibold uppercase text-white">{acc.weekendHolding.value}</p>
                    <p className="mt-1 text-slate-300">
                      {acc.weekendRule.value ?? acc.weekendRule.note ?? "Unverified"}
                    </p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">News Trading Policy</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-semibold uppercase text-white">{acc.newsExecution.value}</p>
                    <p className="mt-1 text-slate-300">{acc.newsRule.value ?? "Unverified"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Consistency &amp; Best-Day Rules</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-semibold uppercase text-white">{acc.consistencyRule.value}</p>
                    <p className="mt-1 text-slate-300">
                      {acc.consistencyDetails.value ?? acc.consistencyRule.note ?? "Unverified"}
                    </p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">EAs, Automation &amp; Execution</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-semibold uppercase text-white">{acc.automationRule.value}</p>
                    <p className="mt-1 text-slate-300">
                      {acc.automationRule.note ?? ""} {acc.otherRestrictions.value ?? ""}
                    </p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Profit Split, Payouts &amp; Refunds</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4 text-slate-200">
                    <p className="font-bold text-cyan-300">Split: {acc.profitSplit.value ?? "Unverified"}</p>
                    <p className="mt-1 text-slate-300">{acc.payoutTerms.value}</p>
                    <p className="mt-1 text-slate-400">{acc.feeTerms.value ?? acc.feeTerms.note}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-300">Official Source Links</td>
                {selectedAccounts.map((acc) => (
                  <td key={acc.id} className="p-4">
                    <div className="flex flex-col gap-1">
                      {acc.price.sourceUrl && (
                        <a
                          href={acc.price.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 underline"
                        >
                          Programme &amp; Pricing Source ↗
                        </a>
                      )}
                      {acc.lossCalculation.sourceUrl && (
                        <a
                          href={acc.lossCalculation.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 underline"
                        >
                          Risk &amp; Drawdown Source ↗
                        </a>
                      )}
                      {acc.payoutTerms.sourceUrl && (
                        <a
                          href={acc.payoutTerms.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 underline"
                        >
                          Payout Policy Source ↗
                        </a>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
