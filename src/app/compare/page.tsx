"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Columns3, Plus, SlidersHorizontal, X } from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { useMemo, useState } from "react";
import { firmAccounts } from "@/data/firms";

const currency = (amount: number, code: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(
    amount,
  );

const DEFAULT_SELECTED = [
  "ftmo-2-step-10k",
  "ftmo-1-step-10k",
  "fundednext-stellar-2-step-15k",
  "brightfunded-2-step-bright-10k",
];

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [firmFilter, setFirmFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<number>(0);

  const firms = useMemo(() => ["all", ...new Set(firmAccounts.map((a) => a.firmName))], []);
  const sizes = useMemo(
    () => [0, ...[...new Set(firmAccounts.map((a) => a.accountSize))].sort((a, b) => a - b)],
    [],
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
    [selectedIds],
  );

  function toggleAccount(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  }

  return (
    <main className="shell inner-page">
      <div className="min-w-0">
        <PageHeading
          eyebrow="Module 03 / Account comparison"
          title="Compare accounts"
          description="Inspect programme fees, loss limits, and trading restrictions side by side. Choose up to four accounts from the research catalogue."
        >
          <Link href="/matches" className="btn btn-secondary">
            Find my matches <ArrowRight size={15} />
          </Link>
        </PageHeading>

        <section className="workspace-panel account-picker" aria-labelledby="selection-title">
          <div className="picker-heading">
            <div>
              <p className="section-label">Comparison set</p>
              <h2 id="selection-title">
                Selected accounts{" "}
                <span className="count-label" aria-live="polite">
                  {selectedIds.length} / 4
                </span>
              </h2>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              aria-expanded={pickerOpen}
              aria-controls="account-catalogue"
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              <SlidersHorizontal size={15} />
              {pickerOpen ? "Close picker" : "Edit selection"}
              <ChevronDown size={14} className={pickerOpen ? "rotate-180" : ""} />
            </button>
          </div>
          <div className="selected-chips" role="group" aria-label="Selected accounts">
            {selectedAccounts.map((account) => (
              <span className="account-chip" key={account.id}>
                {account.firmName} · {account.programmeName.replace("FTMO Challenge: ", "")}
                <button
                  type="button"
                  aria-label={`Remove ${account.firmName} ${account.programmeName}`}
                  onClick={() => toggleAccount(account.id)}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {!selectedIds.length && <p className="text-sm text-muted">No accounts selected yet.</p>}
          </div>
          <div id="account-catalogue" hidden={!pickerOpen} className="account-catalogue">
            <div className="catalogue-filters">
              <label>
                Firm
                <select
                  aria-label="Firm"
                  value={firmFilter}
                  onChange={(event) => setFirmFilter(event.target.value)}
                >
                  {firms.map((firm) => (
                    <option key={firm} value={firm}>
                      {firm === "all" ? "All firms" : firm}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Account size
                <select
                  aria-label="Account size"
                  value={sizeFilter}
                  onChange={(event) => setSizeFilter(Number(event.target.value))}
                >
                  {sizes.map((size) => (
                    <option key={size} value={size}>
                      {size ? `$${size.toLocaleString("en-US")}` : "All sizes"}
                    </option>
                  ))}
                </select>
              </label>
              <p aria-live="polite">
                {filteredCatalogue.length} account{filteredCatalogue.length !== 1 ? "s" : ""} in view
              </p>
            </div>
            <p className="picker-hint">
              {selectedIds.length === 4
                ? "Your set is full. Remove an account to add a different one."
                : "Select an account to add it to the comparison."}
            </p>
            <div className="catalogue-options" role="group" aria-label="Available accounts">
              {filteredCatalogue.map((account) => {
                const active = selectedIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    aria-pressed={active}
                    disabled={!active && selectedIds.length >= 4}
                    onClick={() => toggleAccount(account.id)}
                  >
                    <span className="catalogue-firm">
                      {account.firmName}
                      {active ? <Check size={15} /> : <Plus size={14} />}
                    </span>
                    <strong>{account.programmeName}</strong>
                    <span className="catalogue-fee">
                      {account.price.status === "verified" && account.price.value !== null
                        ? `${currency(account.price.value, account.priceCurrency)} entry fee`
                        : "Fee unverified"}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredCatalogue.length === 0 && (
              <div className="picker-empty">
                <p>No accounts match these filters.</p>
                <button
                  type="button"
                  className="inline-action"
                  onClick={() => {
                    setSizeFilter(0);
                    setFirmFilter("all");
                  }}
                >
                  Reset filters <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="section-heading matrix-heading">
          <div>
            <p className="eyebrow">
              <span />
              Programme rules
            </p>
            <h2>Rule comparison</h2>
          </div>
          <p className="table-hint">
            Scroll across on smaller screens <span aria-hidden="true">↔</span>
          </p>
        </div>
        {selectedAccounts.length > 0 ? (
          <section className="matrix-scroll" aria-label="Selected programme rule comparison" tabIndex={0}>
            <table
              className="rule-matrix"
              style={{ minWidth: selectedAccounts.length > 1 ? 160 + selectedAccounts.length * 200 : 0 }}
            >
              <caption className="sr-only">Account terms and evidence for the selected programmes</caption>
              <thead className="border-b border-line bg-soft">
                <tr>
                  <th scope="col" className="p-4 text-xs font-bold uppercase tracking-wider text-muted">
                    Rule &amp; Parameter
                  </th>
                  {selectedAccounts.map((acc) => (
                    <th key={acc.id} scope="col" className="p-4 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-accent">{acc.firmName}</p>
                          <p className="mt-0.5 text-sm font-bold text-ink">{acc.programmeName}</p>
                        </div>
                        {selectedAccounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleAccount(acc.id)}
                            className="rounded px-1.5 py-0.5 text-muted hover:bg-accent-tint hover:text-ink"
                            aria-label={`Remove ${acc.programmeName} column`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Account Allocation
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 font-bold text-ink tabular-nums">
                      ${acc.accountSize.toLocaleString("en-US")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Verified Entry Fee
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 tabular-nums">
                      {acc.price.status === "verified" && acc.price.value !== null ? (
                        <div>
                          <span className="text-sm font-bold text-emerald-800">
                            {currency(acc.price.value, acc.priceCurrency)}
                          </span>
                          {acc.basePrice?.value && acc.basePrice.value !== acc.price.value && (
                            <span className="ml-1.5 text-muted line-through">
                              {currency(acc.basePrice.value, acc.priceCurrency)}
                            </span>
                          )}
                          {acc.price.note && <p className="mt-1 text-[11px] text-muted">{acc.price.note}</p>}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-amber-800">Unverified Fee</span>
                          {acc.price.note && <p className="mt-1 text-[11px] text-muted">{acc.price.note}</p>}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    True Drawdown Capital &amp; Cost per $1K Drawdown
                  </th>
                  {selectedAccounts.map((acc) => {
                    const dd =
                      acc.overallLossLimitPct.value !== null
                        ? (acc.accountSize * acc.overallLossLimitPct.value) / 100
                        : null;
                    const costPer1k =
                      acc.price.value !== null && dd && dd > 0 ? (acc.price.value / dd) * 1000 : null;
                    return (
                      <td key={acc.id} className="p-4 tabular-nums">
                        <p className="font-semibold text-ink">
                          {dd !== null ? `$${dd.toLocaleString("en-US")} max loss room` : "Unverified"}
                        </p>
                        <p className="text-accent">
                          {costPer1k !== null
                            ? `${currency(costPer1k, acc.priceCurrency)} per $1,000 drawdown`
                            : "Cost ratio unverified"}
                        </p>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Evaluation Phases &amp; Targets
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      {acc.evaluationPhases.value ?? "?"} Phase(s) · Targets:{" "}
                      <strong>{(acc.profitTargetsPct.value ?? []).map((t) => `${t}%`).join(" → ")}</strong>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Daily Loss Limit &amp; Reset
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-bold text-ink">
                        {acc.dailyLossLimitPct.value ?? "?"}% ($
                        {acc.dailyLossLimitPct.value !== null
                          ? ((acc.accountSize * acc.dailyLossLimitPct.value) / 100).toLocaleString("en-US")
                          : "?"}
                        )
                      </p>
                      <p className="mt-1 text-muted">Reset: {acc.dailyReset.value ?? "Unverified"}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Overall Loss &amp; Drawdown Model
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-bold uppercase ${
                          acc.drawdownType.value === "static"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {acc.overallLossLimitPct.value ?? "?"}% · {acc.drawdownType.value}
                      </span>
                      <p className="mt-1.5 text-body">{acc.lossCalculation.value}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Min Trading Days &amp; Time Limit
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p>{acc.minimumTradingDays.value ?? "Unverified"}</p>
                      <p className="mt-1 text-muted">Time limit: {acc.timeLimit.value ?? "Unverified"}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Overnight &amp; Weekend Holding
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-semibold uppercase text-ink">{acc.weekendHolding.value}</p>
                      <p className="mt-1 text-body">
                        {acc.weekendRule.value ?? acc.weekendRule.note ?? "Unverified"}
                      </p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    News Trading Policy
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-semibold uppercase text-ink">{acc.newsExecution.value}</p>
                      <p className="mt-1 text-body">{acc.newsRule.value ?? "Unverified"}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Consistency &amp; Best-Day Rules
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-semibold uppercase text-ink">{acc.consistencyRule.value}</p>
                      <p className="mt-1 text-body">
                        {acc.consistencyDetails.value ?? acc.consistencyRule.note ?? "Unverified"}
                      </p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    EAs, Automation &amp; Execution
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-semibold uppercase text-ink">{acc.automationRule.value}</p>
                      <p className="mt-1 text-body">
                        {acc.automationRule.note ?? ""} {acc.otherRestrictions.value ?? ""}
                      </p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Profit Split, Payouts &amp; Refunds
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4 text-body">
                      <p className="font-bold text-accent">Split: {acc.profitSplit.value ?? "Unverified"}</p>
                      <p className="mt-1 text-body">{acc.payoutTerms.value}</p>
                      <p className="mt-1 text-muted">{acc.feeTerms.value ?? acc.feeTerms.note}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-4 font-semibold text-body">
                    Official Source Links
                  </th>
                  {selectedAccounts.map((acc) => (
                    <td key={acc.id} className="p-4">
                      <div className="flex flex-col gap-1">
                        {acc.price.sourceUrl && (
                          <a
                            href={acc.price.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
                          >
                            Programme &amp; Pricing Source ↗
                          </a>
                        )}
                        {acc.lossCalculation.sourceUrl && (
                          <a
                            href={acc.lossCalculation.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
                          >
                            Risk &amp; Drawdown Source ↗
                          </a>
                        )}
                        {acc.payoutTerms.sourceUrl && (
                          <a
                            href={acc.payoutTerms.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
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
        ) : (
          <div className="workspace-panel empty-state">
            <span className="empty-icon">
              <Columns3 size={30} />
            </span>
            <h2>Start a comparison</h2>
            <p>Add accounts to see their rules and sources side by side.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPickerOpen(true);
                requestAnimationFrame(() =>
                  document.querySelector<HTMLSelectElement>("#account-catalogue select")?.focus(),
                );
              }}
            >
              Choose accounts <Plus size={15} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
