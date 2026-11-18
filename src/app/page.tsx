import Link from "next/link";
import { firmAccounts } from "@/data/firms";

const consultationStages = [
  {
    step: "01",
    title: "Understand the Trader & Strategy",
    subtitle: "Natural-language consultation + contradiction detection",
    description:
      "Describe how you identify setups, confirm entries, place stops, and manage sessions in your own words. The consultation engine extracts timeframes, instruments, R:R, holding cadence, and risk sizing—and asks targeted follow-up questions when details conflict.",
    metrics: ["Methodology & setup triggers", "Session & rollover exposure", "Risk % & losing-streak tolerance"],
  },
  {
    step: "02",
    title: "Empirical Trade-History Diagnostics",
    subtitle: "Closed-trade CSV analysis or manual trade entry",
    description:
      "Establish how your strategy actually behaves in the data rather than relying on labels like 'scalper' or 'day trader'. Measure profit concentration, outlier loss ratios, session edge, overnight/weekend crossings, and sub-30-second execution exposure.",
    metrics: ["Best-day & top-3 profit concentration", "Sequential loss compounding", "Confirmed facts vs. estimates"],
  },
  {
    step: "03",
    title: "Operational Prop-Firm Rule Research",
    subtitle: "27 size-specific account records · Official citations",
    description:
      "We research official programme pages, terms, FAQs, and payout policies across each account size. Phase-to-funded rule transitions (such as FTMO Standard market-break rules or FundedNext news profit adjustments) and unverified fees are explicitly disclosed.",
    metrics: ["Static vs. EOD trailing floors", "Balance vs. higher-of-equity resets", "Zero marketing-language summaries"],
  },
  {
    step: "04",
    title: "Decisive, Evidence-Backed Recommendation",
    subtitle: "11-section advisory dossier & scenario stress-testing",
    description:
      "Receive a reasoned primary recommendation explaining why that specific account fits your behaviour, every material rule broken down into 4 operational parts (A/B/C/D), why alternative accounts rank lower, true cost per $1,000 of drawdown room, and whether buying makes sense right now.",
    metrics: ["9-point executive thesis", "Rule-by-rule A/B/C/D breakdown", "Pre-purchase readiness verdict"],
  },
];

const programmeFamilies = [
  {
    firm: "FTMO",
    programme: "FTMO Challenge · 1-Step",
    sizes: "$10K · $25K · $50K · $100K · $200K",
    currency: "EUR (€79 – €999)",
    drawdown: "3% Daily · 10% EOD Trailing",
    keyDistinction:
      "1-phase (10% target), no minimum days, 90% split, 50% Best Day consistency rule, non-refundable fee. Standard funded stage restricts >2h market breaks and ±2m selected news execution.",
  },
  {
    firm: "FTMO",
    programme: "FTMO Challenge · 2-Step",
    sizes: "$10K · $25K · $50K · $100K · $200K",
    currency: "EUR (€89 – €1,080)",
    drawdown: "5% Daily · 10% Static",
    keyDistinction:
      "2-phase (10% / 5% targets), 4 min days/phase, static 10% loss floor, no Best Day consistency rule, fee refunded with first reward withdrawal.",
  },
  {
    firm: "FundedNext",
    programme: "Stellar 2-Step Challenge",
    sizes: "$6K · $15K · $25K · $50K · $100K · $200K*",
    currency: "USD ($39.99 – $549.99 · $200K conflict disclosed)",
    drawdown: "5% Daily · 10% Static",
    keyDistinction:
      "2-phase (8% / 5% targets), weekend holding allowed, Quick Strike caps <30s trades below 30%, EAs prohibited at $50K+, funded ±5m news winners count at 40%, checkout payout cycle sets consistency rule.",
  },
  {
    firm: "The5ers",
    programme: "High Stakes 2-Step",
    sizes: "$2.5K ($19 verified) · $5K – $100K (fee unverified)",
    currency: "USD ($19 at $2.5K)",
    drawdown: "5% Daily (Higher of Bal/Eq) · 10% Static",
    keyDistinction:
      "2-phase (10% / 5% targets), 3 profitable days/phase, daily 5% resets from higher of prior closing balance or equity, ±2m high-impact news execution prohibited, 30-day inactivity rule.",
  },
  {
    firm: "BrightFunded",
    programme: "2-Step Bright",
    sizes: "$5K · $10K · $25K · $50K · $100K · $200K",
    currency: "EUR (€32.90 – €662.90 promo / €47 – €947 base)",
    drawdown: "4% Daily (Higher of Bal/Eq) · 8% Static",
    keyDistinction:
      "2-phase (8% / 5% targets), 5 min trading days, no consistency rule, 5-minute high-impact news restriction; exact plan weekend and EA specifics remain marked unverified.",
  },
];

export default function Home() {
  const totalRecords = firmAccounts.length;
  const distinctFirms = new Set(firmAccounts.map((f) => f.firmName)).size;

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-2xl sm:p-10 lg:p-14">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              PropFirm Intelligence · Advisory Platform
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-slate-300">
              {totalRecords} Researched Programmes · {distinctFirms} Firms · Snapshot 2026-10-29
            </span>
          </div>

          <div className="mt-7 grid items-start gap-10 lg:grid-cols-[1.25fr_0.95fr]">
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
                Choose a prop firm with evidence from how you actually trade.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                This is not an affiliate directory or a generic price-comparison table that hands you a compatibility
                score and tells you to read the fine print yourself.{" "}
                <strong className="font-semibold text-white">
                  PropFirm Intelligence conducts a systematic strategy consultation, analyses your closed-trade history,
                  explains every material rule in operational terms, and delivers a cited, evidence-based
                  recommendation.
                </strong>
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/matches"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
                >
                  <span>Start Strategy Consultation</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/history"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-200"
                >
                  <span>Analyze Trade History (CSV / Manual)</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  <span>Compare Rule Matrix</span>
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-6 text-left">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">A / B / C / D</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    4-part operational rule breakdown per programme
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-300 tabular-nums">100% Cited</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Every verified rule links to official documentation
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-300 tabular-nums">Zero Fluff</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Unknown rules block reckless purchase advice
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: The Specialist Consultation Standard preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    The Advisory Standard
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">
                    Why generic comparison sites fail traders
                  </h2>
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  Operational Depth
                </span>
              </div>

              <div className="mt-4 space-y-3.5 text-xs leading-5">
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                  <p className="font-semibold text-rose-300">✗ Weak Generic Directory Summary</p>
                  <p className="mt-1 text-slate-300 italic">
                    &ldquo;Firm A is a great choice with a generous 5% daily drawdown, trader-friendly rules, and up to
                    90% profit split.&rdquo;
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
                  <p className="font-semibold text-cyan-300">✓ PropFirm Intelligence Operational Analysis</p>
                  <ul className="mt-2 space-y-2 text-slate-200">
                    <li>
                      <strong className="text-white">A. Documented Rule:</strong> Daily loss is 5% recalculated at
                      00:00 server time from the higher of prior closing balance or floating equity.
                    </li>
                    <li>
                      <strong className="text-white">B. In Practice:</strong> Carrying an open trade with +2.5%
                      floating profit across midnight raises your new daily loss floor—meaning a pullback to breakeven
                      consumes half your daily allowance.
                    </li>
                    <li>
                      <strong className="text-white">C. For Your History:</strong> Your CSV shows 4 overnight holds and
                      a 4-trade losing streak; at 1% risk per trade, a single-day streak leaves only 1.06% buffer for
                      floating excursion and swaps.
                    </li>
                    <li>
                      <strong className="text-white">D. Management Protocol:</strong> Flatten or lock in partials prior
                      to 00:00 rollover and enforce a 2-loss (-2.0%) daily circuit breaker.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Entry Cards (preserving clear pathways to /matches and /history) */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/matches"
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-cyan-400/70 hover:bg-slate-900"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Step 1 · Strategy &amp; Account Consultation
              </p>
              <h2 className="mt-2.5 text-xl font-semibold text-white">
                Compare account programmes &amp; receive your advisory report
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-slate-400">
                Describe your strategy in your own words, resolve follow-up questions, and get a decisive
                recommendation with rule-by-rule A/B/C/D breakdowns, price trade-offs, and alternative comparisons.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 group-hover:translate-x-0.5 transition">
              Open matches &amp; consultation →
            </span>
          </Link>

          <Link
            href="/history"
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-cyan-400/70 hover:bg-slate-900"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Step 2 · Empirical Trade Diagnostics
              </p>
              <h2 className="mt-2.5 text-xl font-semibold text-white">
                Analyze trading history (CSV upload or manual entry)
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-slate-400">
                Import a closed-trade CSV or enter demo trades manually. Measure win rate, profit factor, session edge,
                best-day profit concentration, losing streaks, and drawdown—with confirmed facts separated from
                estimates.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 group-hover:translate-x-0.5 transition">
              Analyze a CSV or enter trades →
            </span>
          </Link>

          <Link
            href="/compare"
            className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-cyan-400/70 hover:bg-slate-900"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Step 3 · Research &amp; Dossier Workspace
              </p>
              <h2 className="mt-2.5 text-xl font-semibold text-white">
                Inspect the 27-programme rule matrix &amp; saved reports
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-slate-400">
                Audit side-by-side drawdown mechanics, phase targets, reset schedules, news/weekend/EA restrictions,
                and cost per $1,000 of usable drawdown room across FTMO, FundedNext, The5ers, and BrightFunded.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 group-hover:translate-x-0.5 transition">
              Open side-by-side matrix →
            </span>
          </Link>
        </section>

        {/* 4-Stage Consultation Pipeline */}
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                Systematic Advisory Methodology
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How PropFirm Intelligence conducts your assessment
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Every conclusion is derived deterministically from your strategy profile, your empirical trade metrics,
              and verified account-specific documentation.
            </p>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {consultationStages.map((stage) => (
              <div
                key={stage.step}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-900/50 p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300">
                      STAGE {stage.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{stage.title}</h3>
                  <p className="mt-1 text-xs font-medium text-cyan-300/90">{stage.subtitle}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{stage.description}</p>
                </div>
                <ul className="mt-5 space-y-1.5 border-t border-slate-800/80 pt-4 text-xs text-slate-300">
                  {stage.metrics.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Researched Prop-Firm Intelligence Database Overview */}
        <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                Internal Prop-Firm Intelligence Database
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Programme-specific rules verified against official sources
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                We never assume that two programmes from the same firm share identical rules. FTMO 1-Step and FTMO
                2-Step differ materially on daily loss (3% vs 5%), drawdown calculation (EOD trailing vs static), Best
                Day consistency (50% vs none), and fee refundability.
              </p>
            </div>
            <Link
              href="/compare"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400"
            >
              Inspect All 27 Size Variants →
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">Firm &amp; Programme</th>
                  <th className="p-4">Researched Sizes</th>
                  <th className="p-4">Verified Fee Range</th>
                  <th className="p-4">Loss Limits &amp; Model</th>
                  <th className="p-4">Operational Nuances &amp; Disclosed Unknowns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {programmeFamilies.map((item) => (
                  <tr key={item.programme} className="align-top transition hover:bg-slate-900/80">
                    <td className="p-4">
                      <p className="text-xs font-semibold text-cyan-300">{item.firm}</p>
                      <p className="mt-0.5 font-semibold text-white">{item.programme}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-300">{item.sizes}</td>
                    <td className="p-4 text-xs text-slate-300 tabular-nums">{item.currency}</td>
                    <td className="p-4">
                      <span className="inline-block rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200">
                        {item.drawdown}
                      </span>
                    </td>
                    <td className="p-4 text-xs leading-5 text-slate-300">{item.keyDistinction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Epistemic Honesty & Security Footer Banner */}
        <section className="mt-10 grid gap-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-6 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Epistemic Honesty on Trade Exports</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              A realized-trade CSV cannot reveal intratrade floating drawdown between snapshots or prove every
              firm-specific rule breach. Our analytics explicitly distinguish confirmed metrics from estimates.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Unknown Rules Are Never Assumed Favourable</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              When an official source is ambiguous, conflicting (such as FundedNext&apos;s $200K fee articles), or
              incomplete, the platform marks the rule unverified and withholds a blind purchase recommendation.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Private &amp; Credential-Free by Design</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              PropFirm Intelligence never asks for broker passwords, MT4/MT5 investor logins, or payment details. CSV
              files are parsed locally in your browser tab.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
