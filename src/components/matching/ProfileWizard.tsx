"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChartCandlestick,
  Check,
  ChevronDown,
  Crosshair,
  Files,
  ListChecks,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { firmAccounts } from "@/data/firms";
import type { TraderProfile, TradingStyle } from "@/lib/matching/types";
import type { ConsultationAssessment } from "@/lib/strategy/consultation";
import type { TradeHistorySummary } from "@/lib/trading-history/types";
import { profilePresets, styles } from "./presets";

const steps = ["Strategy", "Account fit", "Risk review"];
const sizes = [...new Set(firmAccounts.map((account) => account.accountSize))].sort((a, b) => a - b);
const requirements = [
  ["requiresWeekendHolding", "I hold positions over weekends."],
  ["tradesNews", "I trade around news events."],
  ["usesAutomation", "I use an EA or other automation."],
  ["avoidsConsistencyRules", "I want to avoid consistency rules."],
] as const;
const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="profile-field">
      {label}
      {children}
    </label>
  );
}

export function ProfileWizard({
  profile,
  consultation,
  history,
  onChange,
  onSearch,
  onDemoHistory,
}: {
  profile: TraderProfile;
  consultation: ConsultationAssessment;
  history: TradeHistorySummary | null;
  onChange: (patch: Partial<TraderProfile>) => void;
  onSearch: () => void;
  onDemoHistory: () => void;
}) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const { extracted, followUps, suggestedPatch, completenessPct } = consultation;
  const signals = [
    ...extracted.methodology,
    ...extracted.instruments,
    ...extracted.timeframes,
    ...extracted.sessions,
    ...(extracted.riskPerTradePct === null ? [] : [`${extracted.riskPerTradePct}% risk`]),
    ...(extracted.rewardRisk === null ? [] : [`1:${extracted.rewardRisk} target`]),
    ...(extracted.holdingBehavior ? [extracted.holdingBehavior] : []),
  ];
  function moveTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      document.getElementById("profile-form")?.scrollIntoView({ block: "start" });
    });
  }

  return (
    <div className="consult-layout">
      <form
        id="profile-form"
        className="workspace-panel wizard-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) moveTo(step + 1);
          else onSearch();
        }}
      >
        <ol className="wizard-steps" aria-label="Consultation progress">
          {steps.map((label, index) => (
            <li
              key={label}
              data-state={index === step ? "active" : index < step ? "done" : "next"}
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? <Check size={13} /> : `0${index + 1}`}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className="wizard-body">
          <p className="section-label">Step 0{step + 1} / 03</p>
          <h2 id="wizard-heading" tabIndex={-1} ref={heading}>
            {["Tell us how you trade", "Choose your account preferences", "Review your risk profile"][step]}
          </h2>
          <p className="wizard-description">
            {
              [
                "Start with a preset or describe your own approach below.",
                "Set your budget, account size, and the rules your strategy needs.",
                "Add your usual risk and reward targets to put daily loss limits into context.",
              ][step]
            }
          </p>

          {step === 0 && (
            <>
              <div className="preset-row" aria-label="Trading profile presets">
                {profilePresets.map((preset) => {
                  const active = Object.entries(preset.patch).every(
                    ([key, value]) => profile[key as keyof TraderProfile] === value,
                  );
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      aria-pressed={active}
                      onClick={() => onChange(preset.patch)}
                    >
                      {active && <Check size={13} />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <label className="profile-field mt-5">
                Your strategy <span className="optional-label">Optional</span>
                <textarea
                  className="field"
                  rows={3}
                  value={profile.strategyDescription}
                  onChange={(e) => onChange({ strategyDescription: e.target.value })}
                  placeholder="For example: I trade EUR/USD on M15 during London, risking 0.5% per trade for a 1:2 target."
                />
                <span className="field-hint">
                  Include your setup, entry trigger, stop-loss, and when you stay flat.
                </span>
              </label>
              {signals.length > 0 && (
                <div className="signal-box">
                  <p>
                    <ScanLine size={15} />
                    Detected in your description
                  </p>
                  <div className="signal-tags">
                    {signals.map((signal) => (
                      <span key={signal}>{signal}</span>
                    ))}
                  </div>
                  {Object.keys(suggestedPatch).length > 0 && (
                    <button type="button" className="inline-action" onClick={() => onChange(suggestedPatch)}>
                      Apply detected details <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
              <div className="profile-fields">
                <Field label="Trading style">
                  <select
                    className="field"
                    value={profile.tradingStyle}
                    onChange={(e) => onChange({ tradingStyle: e.target.value as TradingStyle })}
                  >
                    {styles.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Markets you trade">
                  <input
                    className="field"
                    value={profile.marketsTraded}
                    onChange={(e) => onChange({ marketsTraded: e.target.value })}
                    placeholder="Forex, indices, metals…"
                  />
                </Field>
                <Field label="Timeframes used">
                  <input
                    className="field"
                    value={profile.executionTimeframe ?? ""}
                    onChange={(e) => onChange({ executionTimeframe: e.target.value })}
                    placeholder="M15 / H1"
                  />
                </Field>
                <Field label="Trading sessions">
                  <input
                    className="field"
                    value={profile.primarySessions ?? ""}
                    onChange={(e) => onChange({ primarySessions: e.target.value })}
                    placeholder="London, New York"
                  />
                </Field>
                <Field label="Trades per week">
                  <input
                    className="field"
                    type="number"
                    min={0}
                    max={1000}
                    value={profile.tradesPerWeek}
                    onChange={(e) => onChange({ tradesPerWeek: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="profile-fields">
                <Field label="Maximum entry budget">
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={profile.maxBudget}
                    onChange={(e) => onChange({ maxBudget: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Budget currency">
                  <select
                    className="field"
                    value={profile.budgetCurrency}
                    onChange={(e) =>
                      onChange({ budgetCurrency: e.target.value as TraderProfile["budgetCurrency"] })
                    }
                  >
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </Field>
                <Field label="Minimum account size (USD)">
                  <select
                    className="field"
                    value={profile.minimumAccountSize}
                    onChange={(e) => onChange({ minimumAccountSize: Number(e.target.value) })}
                  >
                    <option value={0}>No minimum</option>
                    {sizes.map((size) => (
                      <option key={size} value={size}>
                        ${size.toLocaleString("en-US")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Preferred drawdown">
                  <select
                    className="field"
                    value={profile.preferredDrawdown}
                    onChange={(e) =>
                      onChange({ preferredDrawdown: e.target.value as TraderProfile["preferredDrawdown"] })
                    }
                  >
                    <option value="either">No preference</option>
                    <option value="static">Static</option>
                    <option value="trailing">Trailing</option>
                  </select>
                </Field>
              </div>
              <fieldset className="requirements">
                <legend>Strategy requirements</legend>
                {requirements.map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={profile[key]}
                      onChange={(e) => onChange({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <p className="field-hint">
                Fees are compared only in your selected currency. No exchange rate is assumed.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="profile-fields">
                <Field label="Risk per trade (%)">
                  <input
                    className="field"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="e.g. 0.5"
                    value={profile.riskPerTradePct ?? ""}
                    onChange={(e) =>
                      onChange({ riskPerTradePct: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Typical reward-to-risk (R)">
                  <input
                    className="field"
                    type="number"
                    min="0.1"
                    max={50}
                    step="0.1"
                    placeholder="e.g. 2.0"
                    value={profile.typicalRewardRisk ?? ""}
                    onChange={(e) =>
                      onChange({ typicalRewardRisk: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              {followUps.length > 0 && (
                <details className="follow-ups" open>
                  <summary>
                    <span>
                      <ListChecks size={16} />
                      Profile checks ({followUps.length})
                    </span>
                    <ChevronDown size={15} />
                  </summary>
                  {followUps.map((item) => (
                    <div key={item.id} className="follow-up" data-caution={item.type !== "missing_detail"}>
                      <strong>{item.question}</strong>
                      <p>{item.context}</p>
                      {item.options.length > 0 && (
                        <div className="preset-row">
                          {item.options.map((opt) => (
                            <button key={opt.label} type="button" onClick={() => onChange(opt.patch)}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </details>
              )}
              <p className="field-hint mt-4">
                Compatibility scores compare rules to your profile. They are not probabilities of passing or
                receiving a payout.
              </p>
            </>
          )}
        </div>
        <div className="wizard-footer">
          {step > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={() => moveTo(step - 1)}>
              <ArrowLeft size={15} />
              Back
            </button>
          ) : (
            <span className="field-hint">
              <ShieldCheck size={14} />
              No broker login needed
            </span>
          )}
          <button type="submit" className="btn btn-primary">
            {step === 2 ? "Search prop firms" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      <aside className="profile-aside">
        <section className="workspace-panel profile-snapshot">
          <div className="snapshot-top">
            <Crosshair size={22} />
            <span>Consultation brief</span>
          </div>
          <div className="panel-pad">
            <p className="section-label">Current profile</p>
            <h2>Profile snapshot</h2>
            <dl className="snapshot-rows">
              <div>
                <dt>Trading style</dt>
                <dd>{styles.find((style) => style.value === profile.tradingStyle)?.label}</dd>
              </div>
              <div>
                <dt>Entry budget</dt>
                <dd>{money(profile.maxBudget, profile.budgetCurrency)}</dd>
              </div>
              <div>
                <dt>Minimum size</dt>
                <dd>{profile.minimumAccountSize ? money(profile.minimumAccountSize) : "No minimum"}</dd>
              </div>
              <div>
                <dt>Risk per trade</dt>
                <dd>{profile.riskPerTradePct === null ? "Not set" : `${profile.riskPerTradePct}%`}</dd>
              </div>
            </dl>
            <div className="completion-label">
              <span>Profile completeness</span>
              <strong>{completenessPct}%</strong>
            </div>
            <progress aria-label="Profile completeness" value={completenessPct} max={100} />
          </div>
        </section>
        <section className="workspace-panel panel-pad">
          <span className="aside-icon">
            <ChartCandlestick size={19} />
          </span>
          <h3>
            Trade history <span className="optional-label">Optional</span>
          </h3>
          <p className="aside-description">
            {history
              ? `${history.tradeCount} closed trades are linked to this profile. Your results will include this history.`
              : "Add real trading behaviour to your assessment, or explore with a sample."}
          </p>
          <Link href="/history" className="inline-action">
            {history ? "View trade diagnostics" : "Import trade history"}
            <ArrowRight size={14} />
          </Link>
          {!history && (
            <button type="button" onClick={onDemoHistory} className="sample-link">
              <Activity size={14} />
              Try 12 sample trades
            </button>
          )}
        </section>
        <Link className="aside-note" href="/compare">
          <Files size={16} />
          <span>
            Just browsing? <strong>Compare accounts</strong>
          </span>
          <ArrowRight size={14} />
        </Link>
      </aside>
    </div>
  );
}
