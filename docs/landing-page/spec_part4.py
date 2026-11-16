"""Part 4 — Section 7: trading record analysis; Section 8: technical implementation plan."""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Spacer

from spec_pdf_lib import (BAD, CONTENT_W, GOOD, P, bullets, callout, code_block, h2, h3, kv_table,
                          numbered, rule, section_header, stat_tiles, table)

CELL = "CellSm"
ROOT = Path(__file__).resolve().parent


def usd(v, signed=True):
    if v is None:
        return "—"
    s = "+" if (signed and v > 0) else ("\u2212" if (signed and v < 0) else "")
    return f"{s}${abs(v):,.2f}"


def build(st: list, ctx: dict) -> None:
    S = json.loads((ROOT / "trading-stats.json").read_text())
    all_t = S["all_trades"]
    a1 = S["account_1"]
    a2 = S["account_2"]
    curve = json.loads((ROOT / "equity-curve.json").read_text())

    # =============================================================== 7
    st.append(section_header("7", "Trading record: analysis and publication plan",
                             "The 100 exported closed positions, parsed and measured. This section gives you the "
                             "numbers, the honest reading of them, and a tiered recommendation for what belongs on "
                             "a public page."))

    st.append(h2("7.1  Source, method and limits"))
    st.append(kv_table([
        ("Source", "Your exported closed-position history (TradingView/broker-style rows). Parsed from "
                   "<font face='DJM'>docs/landing-page/raw-trades.txt</font> into "
                   "<font face='DJM'>trades.csv</font> by <font face='DJM'>analyse_trades.py</font>. Re-run that "
                   "script after every new export to refresh all figures on the page."),
        ("Sample", f"{all_t['trades']} closed positions · {all_t['first_trade']} to {all_t['last_trade']} · "
                   f"{all_t['calendar_days']} calendar days · {all_t['trades_per_week']} trades per week · "
                   f"{round(all_t['trades']/all_t['calendar_days'],2)} trades per day"),
        ("Fields available", "close timestamp, balance before, balance after, realised P&L, direction, symbol, exit "
                             "price, units, average entry price, quote currency."),
        ("Fields NOT available", "<b>Entry timestamps</b> (so holding duration cannot be computed), commissions and "
                                 "swaps as separate lines, lot/contract sizing rules, open positions, floating "
                                 "equity between closes, and the firm/rule context of each account."),
        ("Account segmentation", f"The export contains {len(S['account_segments'])} distinct balance series. "
                                 f"Segment 1: {a1['trades']} trades, {a1['first_trade']} → {a1['last_trade']}, "
                                 f"balance ${a1['starting_balance']:,.2f} → ${a1['ending_balance']:,.2f}. "
                                 f"Segment 2 begins {a2['first_trade']} with a <b>${a2['starting_balance']:,.0f}</b> "
                                 f"starting balance — a new, larger account. The two are never summed into one "
                                 f"return percentage."),
        ("Currency", "All P&L is USD. USD/JPY rows quote a JPY point value converted at the printed rate; the "
                     "exported USD P&L is used as-is, not recomputed."),
        ("Drawdown definition", "Balance drawdown = (running peak balance − later balance) ÷ running peak balance, "
                                "evaluated only at exported close events. It understates true risk because it "
                                "cannot see floating loss while a position is open. Say this out loud on the page."),
        ("Not proven by this data", "That an account would have passed any specific firm evaluation; that the sample "
                                    "is representative of your whole trading; anything about future performance."),
    ], label_w=38 * mm, style=CELL))

    st.append(h2("7.2  Headline metrics"))
    st.append(stat_tiles([
        (usd(all_t["net_pnl"]), "Net P&L", f"{all_t['trades']} trades"),
        (f"{all_t['win_rate_pct']}%", "Win rate", f"{all_t['wins']}W · {all_t['losses']}L · {all_t['breakeven']}BE"),
        (f"{all_t['profit_factor']}", "Profit factor", "gross win ÷ gross loss"),
        (f"{all_t['payoff_ratio']}", "Payoff ratio", "avg win ÷ avg loss"),
    ], per_row=4, tone="accent"))
    st.append(table(["Metric", "Full sample (100 trades)", "Segment 1 (99 trades)", "Segment 2 (new $100k account)"],
                    [
                        ["Period", f"{all_t['first_trade']} → {all_t['last_trade']}", f"{a1['first_trade']} → {a1['last_trade']}", f"{a2['first_trade']}"],
                        ["Starting balance", f"${all_t['starting_balance']:,.2f}", f"${a1['starting_balance']:,.2f}", f"${a2['starting_balance']:,.2f}"],
                        ["Ending balance", f"${all_t['ending_balance']:,.2f}", f"${a1['ending_balance']:,.2f}", f"${a2['ending_balance']:,.2f}"],
                        ["Peak balance", f"${all_t['peak_balance']:,.2f}", f"${a1['peak_balance']:,.2f}", f"${a2['peak_balance']:,.2f}"],
                        ["Net P&L", usd(all_t["net_pnl"]), usd(a1["net_pnl"]), usd(a2["net_pnl"])],
                        ["Return on starting balance", f"{all_t['net_return_pct']}% *", f"{a1['net_return_pct']}%", f"{a2['net_return_pct']}%"],
                        ["Trades / week", f"{all_t['trades_per_week']}", f"{a1['trades_per_week']}", "—"],
                        ["Wins / losses / break-even", f"{all_t['wins']} / {all_t['losses']} / {all_t['breakeven']}", f"{a1['wins']} / {a1['losses']} / {a1['breakeven']}", f"{a2['wins']} / {a2['losses']} / {a2['breakeven']}"],
                        ["Win rate", f"{all_t['win_rate_pct']}%", f"{a1['win_rate_pct']}%", f"{a2['win_rate_pct']}%"],
                        ["Gross profit / gross loss", f"${all_t['gross_profit']:,.2f} / ${all_t['gross_loss']:,.2f}", f"${a1['gross_profit']:,.2f} / ${a1['gross_loss']:,.2f}", "—"],
                        ["Profit factor", f"{all_t['profit_factor']}", f"{a1['profit_factor']}", "—"],
                        ["Average win", usd(all_t["avg_win"]), usd(a1["avg_win"]), usd(a2["avg_win"])],
                        ["Average loss", usd(all_t["avg_loss"]), usd(a1["avg_loss"]), "—"],
                        ["Payoff ratio", f"{all_t['payoff_ratio']}", f"{a1['payoff_ratio']}", "—"],
                        ["Expectancy per trade", usd(all_t["expectancy_per_trade"]), usd(a1["expectancy_per_trade"]), usd(a2["expectancy_per_trade"])],
                        ["Expectancy as % of balance", f"{all_t['expectancy_pct_of_balance']}%", f"{a1['expectancy_pct_of_balance']}%", f"{a2['expectancy_pct_of_balance']}%"],
                        ["Largest win", usd(all_t["largest_win"]), usd(a1["largest_win"]), usd(a2["largest_win"])],
                        ["Largest loss", usd(all_t["largest_loss"]), usd(a1["largest_loss"]), "—"],
                        ["Average win as % of balance", f"{all_t['avg_win_pct_of_balance']}%", f"{a1['avg_win_pct_of_balance']}%", f"{a2['avg_win_pct_of_balance']}%"],
                        ["Average loss as % of balance", f"{all_t['avg_loss_pct_of_balance']}%", f"{a1['avg_loss_pct_of_balance']}%", "—"],
                        ["Worst single loss as % of balance", f"{all_t['largest_loss_pct_of_balance']}%", f"{a1['largest_loss_pct_of_balance']}%", "—"],
                        ["Max balance drawdown", f"{all_t['max_balance_drawdown_pct']}%  ({usd(-all_t['max_balance_drawdown_usd'])})", f"{a1['max_balance_drawdown_pct']}%  (${a1['drawdown_peak_balance']:,.2f} → ${a1['drawdown_trough_balance']:,.2f})", "—"],
                        ["Best win streak / worst loss streak", f"{all_t['best_win_streak']} / {all_t['worst_loss_streak']}", f"{a1['best_win_streak']} / {a1['worst_loss_streak']}", "—"],
                    ],
                    widths=[46 * mm, 44 * mm, 44 * mm, CONTENT_W - 134 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(P("<small>* The full-sample \"return on starting balance\" is arithmetically meaningless because the "
                "sample spans two accounts with different sizes ($13,194.05 then $100,000). <b>Never publish "
                f"{all_t['net_return_pct']}% as a return.</b> Publish the dollar net P&L per segment instead.</small>",
                "Small"))

    st.append(h2("7.3  Monthly results"))
    st.append(table(["Month", "Trades", "Net P&L", "Win rate", "Balance at month end", "Note"],
                    [[m["month"], m["trades"], usd(m["net_pnl"]), f"{m['win_rate_pct']}%",
                      f"${m['end_balance']:,.2f}",
                      "Includes the account reset to $100,000 on 13 Nov" if m["month"] == "2026-11" else
                      ("Worst month — heavy EUR/USD long losses" if m["net_pnl"] < -1000 else
                       "Roughly flat, high churn: 50 trades for +$145")]
                      for m in S["monthly"]],
                    widths=[20 * mm, 16 * mm, 26 * mm, 18 * mm, 32 * mm, CONTENT_W - 112 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "<b>Read this honestly:</b> October produced 50 trades for +$144.98 — a 26.0% win rate offset by a strong "
        "payoff. That is high churn for near-zero progress, and it is the single most useful insight in the whole "
        "export. On <font face='DJM'>/trading</font>, present it as a finding, not a failure: <i>\"October: 50 "
        "trades, +$145. Fewer, better-selected trades is the current focus.\"</i>"))

    st.append(h2("7.4  By instrument"))
    st.append(table(["Instrument", "Trades", "Share", "Net P&L", "Win rate", "Profit factor", "Avg P&L"],
                    [[r["key"], r["trades"], f"{r['share_of_trades_pct']}%", usd(r["net_pnl"]),
                      f"{r['win_rate_pct']}%", "—" if r["profit_factor"] is None else f"{r['profit_factor']}",
                      usd(r["avg_pnl"])] for r in all_t["by_symbol"]],
                    widths=[34 * mm, 16 * mm, 16 * mm, 26 * mm, 18 * mm, 22 * mm, CONTENT_W - 132 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(bullets([
        f"<b>Gold is the edge:</b> 23 trades, {usd(2521.78)}, profit factor 1.90, 43.5% win rate — the best "
        "combination of frequency and quality in the sample.",
        f"<b>Silver works:</b> 18 trades, {usd(1983.40)}, profit factor 1.47, and it produced the first closed "
        "trade on the new $100,000 account (+$2,297.18 on 13 Nov 2026).",
        f"<b>EUR/USD is the leak:</b> the most-traded instrument (29 trades, 29% of activity) and the biggest loser "
        "(−$3,998.71, profit factor 0.56, 20.7% win rate). Removing it would have turned the sample from "
        "+$2,783.61 into roughly +$6,782.",
        f"<b>Oil and BTC are one-off / neutral:</b> WTI is a single +$2,029.44 trade (too small a sample to claim), "
        "BTC is 7 trades for +$9.37 — effectively scratch.",
    ]))

    st.append(h2("7.5  By direction"))
    st.append(table(["Direction", "Trades", "Net P&L", "Win rate", "Profit factor", "Avg P&L"],
                    [[r["key"].capitalize(), r["trades"], usd(r["net_pnl"]), f"{r['win_rate_pct']}%",
                      f"{r['profit_factor']}", usd(r["avg_pnl"])] for r in all_t["by_direction"]],
                    widths=[24 * mm, 18 * mm, 28 * mm, 20 * mm, 24 * mm, CONTENT_W - 114 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("do",
        "<b>This is your strongest public talking point.</b> Shorts returned +$7,717.01 at a 1.81 profit factor "
        "(40.0% win rate) while longs returned −$4,933.40 at 0.52 (28.9%). Stating this on the page demonstrates "
        "exactly the self-awareness an evaluation client is hiring for: you measured your own bias and named it. "
        "Suggested line: <i>\"My realised edge in this sample is short-side and metals-biased. I am not going to "
        "pretend otherwise.\"</i>"))

    st.append(h2("7.6  By weekday and session (UTC)"))
    st.append(h3("Weekday"))
    st.append(table(["Day", "Trades", "Net P&L", "Win rate", "Profit factor"],
                    [[r["key"], r["trades"], usd(r["net_pnl"]), f"{r['win_rate_pct']}%",
                      "—" if r["profit_factor"] is None else f"{r['profit_factor']}"] for r in all_t["by_weekday"]],
                    widths=[20 * mm, 18 * mm, 28 * mm, 20 * mm, CONTENT_W - 86 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(h3("Session block (3-hour buckets, UTC; Abuja = UTC+1)"))
    st.append(table(["Session (UTC)", "Trades", "Net P&L", "Win rate", "Profit factor"],
                    [[r["key"], r["trades"], usd(r["net_pnl"]), f"{r['win_rate_pct']}%",
                      "—" if r["profit_factor"] is None else f"{r['profit_factor']}"] for r in all_t["by_session_utc"]],
                    widths=[34 * mm, 18 * mm, 28 * mm, 20 * mm, CONTENT_W - 100 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(bullets([
        "<b>Best window:</b> 21:00–24:00 UTC — 4 trades, +$3,101.35, 75% win rate. Small sample; treat as a "
        "hypothesis, not a rule.",
        "<b>Second best:</b> 12:00–15:00 UTC — 21 trades, +$3,331.50, profit factor 2.01. This is the "
        "US-morning/London-overlap window and it has enough trades to be meaningful.",
        "<b>Worst window:</b> 00:00–06:00 UTC — 16 trades for −$4,404.33 combined, with profit factors of 0.06 and "
        "0.22. Late-night trading is measurably the most expensive habit in this sample.",
        "<b>Monday effect:</b> 15 trades, −$1,706.20, profit factor 0.51. Tuesday is the best day "
        "(+$4,899.80, PF 2.42).",
        "<b>Actionable rule to publish:</b> \"No new entries between 00:00 and 06:00 UTC.\" Writing a rule that the "
        "data forced on you is far more convincing than any win-rate claim.",
    ]))

    st.append(h2("7.7  Risk integrity check — read this before publishing anything"))
    st.append(callout("warn",
        "The CV states disciplined risk management of <b>1–2% per trade</b>. The exported sample does not fully "
        "support that statement, and an evaluative reader (exactly the kind you are targeting) will check. "
        "Publishing the numbers without addressing this is the one real reputational risk in this project."))
    st.append(table(["Observation", "Value from the data", "What it means", "How to handle it"],
                    [
                        ["Average losing trade", f"{all_t['avg_loss_pct_of_balance']}% of balance at entry",
                         "Above the stated 1–2% rule.",
                         "State the rule as a target and the realised average as the measurement: \"Target 1–2%; "
                         "realised average loss in this sample 2.6% of balance.\""],
                        ["Worst single loss", f"{all_t['largest_loss_pct_of_balance']}% of balance (−$1,228.51 on 11 Nov 2026, EUR/USD long)",
                         "A single event nearly five times the stated risk cap.",
                         "Do not hide it. One sentence: \"The worst loss in the sample was 9.4% of balance — a "
                         "sizing error I have since written a rule against.\""],
                        ["Max balance drawdown", f"{all_t['max_balance_drawdown_pct']}% (${all_t['drawdown_peak_balance']:,.2f} → ${all_t['drawdown_trough_balance']:,.2f})",
                         "Would breach virtually every prop firm's daily and total drawdown limits.",
                         "Label it clearly as <i>balance</i> drawdown on an unfunded/personal sample and note that "
                         "firm evaluations impose tighter limits — which is precisely why you built the matching tool."],
                        ["Longest losing streak", f"{all_t['worst_loss_streak']} consecutive losses",
                         "With a 35% win rate this is statistically normal, not a red flag — but it must be disclosed.",
                         "Include it in the stat grid. A 35% win rate with a 2.05 payoff is a legitimate "
                         "trend-following profile; the streak is the price of that profile."],
                        ["Win rate vs payoff", f"{all_t['win_rate_pct']}% win rate, {all_t['payoff_ratio']} payoff ratio, PF {all_t['profit_factor']}",
                         "Coherent and internally consistent — this is a real low-win-rate/high-payoff system, not noise.",
                         "Explain the profile in one line so nobody mistakes 35% for incompetence: \"I am paid for "
                         "being right big, not for being right often.\""],
                        ["Trade frequency", f"{all_t['trades_per_week']} trades/week; 50 trades in October for +$145",
                         "Overtrading is visible in the data.",
                         "Name it as the current improvement focus. Self-diagnosis is the most persuasive content "
                         "on this page."],
                        ["Sample size", "100 trades, 64 days, two accounts",
                         "Enough for descriptive statistics, not enough for statistical significance.",
                         "Always show the sample size next to every figure, and the date range."],
                    ],
                    widths=[30 * mm, 40 * mm, 40 * mm, CONTENT_W - 110 * mm], cell_style=CELL))

    st.append(h2("7.8  Publication tiers — what to show, what to contextualise, what to omit"))
    st.append(table(["Tier", "Figures", "Where they may appear", "Condition"],
                    [
                        ["<b>A — Publish freely</b><br/>Safe, verifiable, no performance implication",
                         "Sample size (100 trades) and date range (10 Sep – 13 Nov 2026) · instruments traded · "
                         "trade count per instrument · short vs long split · sessions traded · new $100,000 account "
                         "opened 13 Nov 2026 · 5+ years trading · 10,000+ hours · 7+ evaluations passed · "
                         "method and data limits",
                         "Hero chips, proof strip, S8, /trading",
                         "None. These are facts about activity, not returns."],
                        ["<b>B — Publish with context</b><br/>Real performance numbers",
                         "Net P&L per segment (+$486.43 on segment 1, +$2,297.18 on segment 2) · win rate 35.0% · "
                         "profit factor 1.14 · payoff 2.05 · average win/loss · expectancy · max balance drawdown "
                         "40.79% · worst loss streak 12 · per-instrument P&L",
                         "/trading page, and the S8 compact panel",
                         "Every figure must sit next to (a) the sample size and dates, (b) the balance-drawdown "
                         "caveat, and (c) the disclaimer from Section 6.6. Drawdown and the losing streak must be "
                         "shown, not just the winners."],
                        ["<b>C — Do not publish</b><br/>Unsupported or misleading",
                         "Any \"% return\" mixing the two accounts (21.1%) · any annualised or projected figure · "
                         "\"consistently profitable\" · \"passed every evaluation\" · any claim about firm-funded "
                         "payouts you have not received · the WTI single trade as an edge · any figure from before "
                         "10 Sep 2026 that you cannot export and show",
                         "Nowhere",
                         "If you cannot produce the export behind it, it does not go on the page."],
                    ],
                    widths=[36 * mm, 62 * mm, 32 * mm, CONTENT_W - 130 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("do",
        "<b>Recommended S8 (landing page) set:</b> net P&L <b>+$486.43</b> for the personal account segment and "
        "<b>+$2,297.18</b> first trade on the new $100,000 account; win rate <b>35.0%</b>; payoff ratio "
        "<b>2.05</b>; max balance drawdown <b>40.79%</b> shown alongside them; sample size and dates in the "
        "sub-line. Showing the drawdown next to the profit is what makes the whole panel credible — and it is "
        "exactly the behaviour an AI-evaluation client is screening for."))

    st.append(h2("7.9  Chart specifications"))
    st.append(table(["Chart", "Data", "Spec"],
                    [
                        ["Equity curve (S8 + /trading)", "<font face='DJM'>equity-curve.json</font> — balance after each close",
                         "SVG polyline, 1.5 px stroke in accent, area fill as a vertical gradient from accent at 25% "
                         "to transparent. X = trade index (not date — the export is unevenly spaced), Y = balance, "
                         "auto-scaled with 5% padding. A vertical dashed marker at trade #100 with the label "
                         "\"New $100,000 account\". Because the balance jumps from $13,680 to $102,297, render "
                         "segment 1 and segment 2 as two separate panels (small multiples) rather than one axis — "
                         "one axis would flatten segment 1 into a straight line."],
                        ["Drawdown chart (/trading)", "Derived: running peak vs balance, segment 1 only",
                         "Filled area below zero in negative colour at 40% opacity. Label the 40.79% trough with its "
                         "date (27 Oct 2026)."],
                        ["Instrument bars (S8 + /trading)", "<font face='DJM'>by_symbol</font>",
                         "Horizontal bars, diverging around a zero line: positive to the right in positive colour, "
                         "negative to the left in negative colour. Value in mono at the bar end, trade count and "
                         "profit factor as a muted suffix."],
                        ["Session heatmap (/trading)", "<font face='DJM'>by_session_utc</font>",
                         "8 rows (3-hour buckets) × value cells coloured by net P&L intensity; include trade count "
                         "in each cell so tiny samples are visible as tiny samples."],
                        ["Monthly columns (/trading)", "<font face='DJM'>monthly</font>",
                         "Three columns, signed colour, net P&L label above, trade count below. Add the note about "
                         "the November balance being a different account."],
                    ],
                    widths=[36 * mm, 44 * mm, CONTENT_W - 80 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "All charts are hand-rolled SVG from JSON at build time. No chart library: it keeps roughly 100–300 KB of "
        "JavaScript off the page and the data is static anyway. Every chart must have a visually hidden "
        "<font face='DJM'>&lt;table&gt;</font> equivalent for screen readers (Section 8.6)."))

    st.append(h2("7.10  What this data says about you — use these in interviews"))
    st.append(numbered([
        "<b>You run a low-win-rate, high-payoff system.</b> 35% win rate with a 2.05 payoff and a 1.14 profit "
        "factor. That is a coherent, defensible profile — but it demands emotional tolerance for 12 consecutive "
        "losses, which you demonstrably survived and traded through.",
        "<b>Your edge is directional and instrument-specific.</b> Short-side, metals-heavy. EUR/USD longs cost you "
        "$3,998.71. Knowing this is worth more than any new indicator.",
        "<b>Session discipline is your biggest free improvement.</b> The 00:00–06:00 UTC block lost $4,404.33 "
        "across 16 trades at profit factors of 0.06 and 0.22. Simply not trading that window would have "
        "materially changed the sample.",
        "<b>October shows churn without progress.</b> 50 trades, +$145, 26% win rate. The fix is selectivity, not "
        "more analysis.",
        "<b>You build your own measurement tools.</b> Most traders assert discipline; you exported the ledger, "
        "wrote a parser and computed the metrics. That is the single most transferable thing on this page — and it "
        "is why the trading section belongs on a developer's landing page at all.",
    ]))
    st.append(PageBreak())

    # =============================================================== 8
    st.append(section_header("8", "Technical implementation plan",
                             "Built inside this repository, on the stack it already uses. Nothing here requires a "
                             "new framework, a CMS, or a backend."))

    st.append(h2("8.1  Stack and constraints"))
    st.append(table(["Item", "Value", "Note"],
                    [
                        ["Framework", "Next.js 16.4.3, App Router", "<b>Read <font face='DJM'>AGENTS.md</font> and the guides in <font face='DJM'>node_modules/next/dist/docs/</font> first.</b> This version has breaking changes versus older Next.js; do not build from memory."],
                        ["UI", "React 19.3.0", "Server Components by default; add <font face='DJM'>\"use client\"</font> only to the nav, charts, form and reveal animations."],
                        ["Styling", "Tailwind CSS v4 (<font face='DJM'>@tailwindcss/turbopack</font>)", "Configure with <font face='DJM'>@theme</font> in CSS — there is no <font face='DJM'>tailwind.config.js</font> in v4."],
                        ["Language", "TypeScript 5.x, strict", "<font face='DJM'>npx tsc --noEmit</font> must pass."],
                        ["Testing", "Vitest 3.x", "Add content and stats tests alongside the existing <font face='DJM'>tests/</font>."],
                        ["Linting", "ESLint 9 + eslint-config-next", "<font face='DJM'>npm run lint</font> must pass."],
                        ["Build", "<font face='DJM'>npm run build</font> (next build --webpack)", "Keep the existing script."],
                        ["Existing routes", "<font face='DJM'>/matches</font>, <font face='DJM'>/history</font>", "Do not modify their behaviour. The landing page links to them."],
                        ["Hosting", "Vercel", "Same platform as your recruitment-portal front end [CV]."],
                        ["No backend", "Form provider + static content", "Nothing is stored server-side by you; matches the privacy stance already documented in the README."],
                    ],
                    widths=[28 * mm, 46 * mm, CONTENT_W - 74 * mm], cell_style=CELL))

    st.append(h2("8.2  File tree"))
    st.append(code_block(
        "src/\n"
        "  app/\n"
        "    layout.tsx            # root layout: fonts, metadata, Navbar, footer, JSON-LD\n"
        "    globals.css           # design tokens (Section 5.2) + base styles + print styles\n"
        "    page.tsx              # LANDING PAGE: composes S0-S15 from components\n"
        "    trading/page.tsx      # full trading evidence page (optional but recommended)\n"
        "    matches/page.tsx      # existing product route - unchanged\n"
        "    history/page.tsx      # existing product route - unchanged\n"
        "    not-found.tsx         # 404 (copy in Section 6.4)\n"
        "    sitemap.ts            # dynamic sitemap\n"
        "    robots.ts             # allow all, point at sitemap\n"
        "  components/\n"
        "    Navbar.tsx            # extend existing: add landing anchors + mobile sheet\n"
        "    ui/                   # Button, Card, Chip, StatTile, SectionHeading,\n"
        "                          # TimelineItem, ProjectCard, Accordion, Sparkline,\n"
        "                          # BarRow, Disclaimer\n"
        "    landing/              # Hero, ProofStrip, Pillars, About, Skills,\n"
        "                          # Projects, TradingPanel, Experience, Credentials,\n"
        "                          # Leadership, References, RemoteWork, Faq, ContactForm,\n"
        "                          # SiteFooter, Reveal (scroll animation wrapper)\n"
        "  content/\n"
        "    profile.ts            # ALL copy from Section 6, typed (schema in Appendix B)\n"
        "    projects.ts           # project entries\n"
        "    trading.ts            # typed stats imported from trading-stats.json\n"
        "  lib/\n"
        "    matching/             # existing - unchanged\n"
        "    trading-history/      # existing - unchanged\n"
        "    seo.ts                # metadata builder + JSON-LD generators\n"
        "public/\n"
        "  Divine_Abba_Chimdirim_Resume.pdf\n"
        "  trades.csv\n"
        "  images/hero-portrait.webp  hero-portrait@2x.webp  og-image.png\n"
        "  images/projects/propfirm-matches.webp  propfirm-history.webp\n"
        "                 recruitment-portal.webp  banking-app.webp  ecommerce.webp\n"
        "  images/desk-setup.webp\n"
        "  icon.svg  apple-icon.png  favicon.ico\n"
        "docs/landing-page/        # this spec + data + analysis script\n"
        "tests/\n"
        "  content.test.ts         # copy integrity: no banned words, all links present\n"
        "  trading-stats.test.ts   # recomputed stats match published figures\n"
        "  seo.test.ts             # metadata + JSON-LD shape",
        title="Target file tree"))

    st.append(h2("8.3  Content as data, not JSX"))
    st.append(P("All copy lives in <font face='DJM'>src/content/profile.ts</font> as typed constants. Components read "
                "from it. This is the single most important implementation decision: it lets you rewrite headlines, "
                "add a project or update trading figures without touching layout, and it makes the content testable."))
    st.append(code_block(
        'export type Proficiency = "core" | "working";\n\n'
        "export interface SkillGroup { heading: string; core: string[]; working: string[] }\n"
        "export interface ProjectEntry {\n"
        "  slug: string; title: string; kicker?: string; oneLiner: string; body: string;\n"
        "  stack: string[]; metrics: string[];\n"
        "  links: { label: string; href: string; external: boolean }[];\n"
        "  image: { src: string; alt: string }; featured?: boolean;\n"
        "}\n"
        "export interface ExperienceEntry {\n"
        "  period: string; role: string; org: string; location: string;\n"
        "  bullets: string[]; current?: boolean;\n"
        "}\n"
        "export interface Credential {\n"
        "  kind: \"certificate\" | \"education\"; title: string; issuer: string;\n"
        "  date: string; id?: string; detail?: string; verifyUrl?: string;\n"
        "}\n"
        "export const profile = {\n"
        '  name: "Divine Abba Chimdirim",\n'
        '  monogram: "DAC",\n'
        '  roleLine: "AI Training & Evaluation · Software Developer (JavaScript, React, Node.js)",\n'
        '  city: "Abuja", country: "Nigeria", timezone: "WAT (UTC+1)",\n'
        '  email: "divineabbachimdirim1@gmail.com",\n'
        '  phone: "+234 906 749 2422",\n'
        '  github: "https://github.com/Divine-AC",\n'
        '  linkedin: "https://www.linkedin.com/in/divine-abba-883540311",\n'
        '  cvUrl: "/Divine_Abba_Chimdirim_Resume.pdf",\n'
        '  tradeLedgerUrl: "/trades.csv",\n'
        '  availability: "OPEN_TO_REMOTE",   // [CONFIRM exact wording]\n'
        "} as const;",
        title="src/content/profile.ts — type skeleton (full contract in Appendix B)"))

    st.append(h2("8.4  SEO metadata and structured data"))
    st.append(code_block(
        'import type { Metadata } from "next";\n\n'
        "export const metadata: Metadata = {\n"
        '  metadataBase: new URL("https://divinechimdirim.com"),  // [CONFIRM domain]\n'
        '  title: "Divine Abba Chimdirim — AI Evaluation & Developer",\n'
        "  description:\n"
        '    "AI training and evaluation specialist and full-stack React/Node.js developer in Abuja, '
        'Nigeria. Mercor-certified, verifiable credentials, shipped projects, documented trading record.",\n'
        '  keywords: ["AI agent evaluation","AI training data","React developer Nigeria",'
        '"Node.js developer","remote JavaScript developer","prop firm trader"],\n'
        '  alternates: { canonical: "/" },\n'
        "  openGraph: {\n"
        '    type: "profile", title: "Divine Abba Chimdirim — AI Evaluation & Full-Stack Developer",\n'
        '    description: "Rubric-based AI evaluation, React/Node.js delivery, and a documented trading record.",\n'
        '    url: "/", siteName: "Divine Abba Chimdirim", locale: "en_NG",\n'
        '    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "Divine Abba Chimdirim" }],\n'
        "  },\n"
        '  twitter: { card: "summary_large_image", title: "Divine Abba Chimdirim", '
        'description: "AI evaluation & full-stack developer, Abuja." },\n'
        '  robots: { index: true, follow: true },\n'
        "};",
        title="src/app/page.tsx metadata"))
    st.append(code_block(
        '{\n'
        '  "@context": "https://schema.org",\n'
        '  "@type": "Person",\n'
        '  "name": "Divine Abba Chimdirim",\n'
        '  "jobTitle": "AI Training & Evaluation Specialist; Software Developer",\n'
        '  "description": "Software developer trained in AI agent evaluation; five years trading proprietary capital.",\n'
        '  "url": "https://divinechimdirim.com/",\n'
        '  "email": "mailto:divineabbachimdirim1@gmail.com",\n'
        '  "telephone": "+2349067492422",\n'
        '  "address": { "@type": "PostalAddress", "addressLocality": "Abuja", "addressCountry": "NG" },\n'
        '  "sameAs": ["https://github.com/Divine-AC",'
        '"https://www.linkedin.com/in/divine-abba-883540311"],\n'
        '  "knowsAbout": ["AI agent evaluation","React","Node.js","Express","MongoDB",'
        '"REST APIs","JWT","TypeScript","Foreign exchange trading","Risk management"],\n'
        '  "hasCredential": [\n'
        '    { "@type": "EducationalOccupationalCredential", "name": "Introduction to Agents",'
        ' "credentialCategory": "certificate", "recognizedBy": { "@type": "Organization", "name": "Mercor" },'
        ' "dateCreated": "2026-10", "identifier": "MRC-2026-HKHJULZA" },\n'
        '    { "@type": "EducationalOccupationalCredential", "name": "Software Development",'
        ' "credentialCategory": "certificate", "recognizedBy": { "@type": "Organization", "name": "TS Academy" },'
        ' "dateCreated": "2026-10-31", "identifier": "TSWW5QW86KV4MJ" }\n'
        "  ],\n"
        '  "alumniOf": [{ "@type": "EducationalOrganization", "name": "Abia State Polytechnic" },'
        '{ "@type": "EducationalOrganization", "name": "TS Academy" }]\n'
        "}\n\n"
        "// Also emit: WebSite (with name + url), ItemList of the four projects, and\n"
        "// FAQPage for the six S14 questions. Inject via a <script type=\"application/ld+json\">\n"
        "// in the root layout, generated by src/lib/seo.ts.",
        title="JSON-LD: Person (inject in root layout)"))
    st.append(bullets([
        "Add <font face='DJM'>src/app/sitemap.ts</font> listing <font face='DJM'>/</font>, "
        "<font face='DJM'>/trading</font>, <font face='DJM'>/projects</font>, <font face='DJM'>/matches</font>, "
        "<font face='DJM'>/history</font> with <font face='DJM'>lastModified</font>.",
        "Add <font face='DJM'>src/app/robots.ts</font> allowing everything and pointing at the sitemap.",
        "One <font face='DJM'>&lt;h1&gt;</font> per page; headings never skip a level; section headings are "
        "<font face='DJM'>&lt;h2&gt;</font> and card titles <font face='DJM'>&lt;h3&gt;</font>.",
        "Submit the URL to Google Search Console and Bing Webmaster on day one; add the link to your GitHub profile "
        "README and LinkedIn so it gets crawled fast.",
    ]))

    st.append(h2("8.5  Performance budget"))
    st.append(table(["Metric", "Budget", "How to hit it"],
                    [
                        ["Lighthouse Performance (mobile)", "≥ 95", "Static content, no client data fetching, no third-party scripts except the form provider."],
                        ["LCP", "≤ 2.0 s", "Preload the hero portrait (<font face='DJM'>priority</font> on next/image), self-host fonts via <font face='DJM'>next/font</font>, inline critical CSS (Next does this)."],
                        ["CLS", "≤ 0.05", "Explicit width/height on every image and chart SVG; reserve space for the stat tiles; font-display swap with size-adjust."],
                        ["INP", "≤ 200 ms", "Only four client components (nav, form, charts, reveal). No animation on the main thread beyond transform/opacity."],
                        ["First-party JS", "≤ 90 KB gzipped", "No chart library, no animation library, no icon barrel imports (import individual Lucide icons)."],
                        ["Total page weight", "≤ 600 KB", "AVIF/WebP images, SVG charts, two font families at 3 weights max."],
                        ["Images", "Hero ≤ 120 KB, project shots ≤ 80 KB each", "<font face='DJM'>next/image</font> with <font face='DJM'>sizes</font> set correctly per breakpoint; lazy below the fold."],
                        ["TTFB", "≤ 300 ms", "Static rendering; no server actions on the landing page."],
                    ],
                    widths=[44 * mm, 24 * mm, CONTENT_W - 68 * mm], cell_style=CELL))

    st.append(h2("8.6  Accessibility requirements (WCAG 2.2 AA)"))
    st.append(bullets([
        "Semantic landmarks: one <font face='DJM'>&lt;header&gt;</font>, <font face='DJM'>&lt;nav aria-label=\"Primary\"&gt;</font>, "
        "<font face='DJM'>&lt;main id=\"main\"&gt;</font>, <font face='DJM'>&lt;section aria-labelledby&gt;</font> per block, one <font face='DJM'>&lt;footer&gt;</font>.",
        "Skip link as the first focusable element; visible on focus; moves focus to <font face='DJM'>#main</font>.",
        "All text pairings meet 4.5:1 (body) and 3:1 (≥ 24 px text and UI components). Verify with the contrast column in Section 5.2.",
        "Every interactive element has a focus-visible ring of 2 px accent with 2 px offset; focus is never removed.",
        "Touch targets ≥ 44×44 px on mobile; form inputs ≥ 44 px tall.",
        "All images have meaningful alt text; decorative images and icons are <font face='DJM'>alt=\"\"</font> / <font face='DJM'>aria-hidden</font>.",
        "Charts: <font face='DJM'>role=\"img\"</font> with an <font face='DJM'>aria-label</font> summarising the trend, plus a visually hidden <font face='DJM'>&lt;table&gt;</font> with the same data and a \"View data as table\" toggle.",
        "Numbers that convey meaning use tabular figures and are not colour-only: sign prefixes (+/−) are always printed, so red/green colour-blind readers lose nothing.",
        "Motion: honour <font face='DJM'>prefers-reduced-motion</font> globally; nothing autoplays.",
        "Form: real <font face='DJM'>&lt;label for&gt;</font> on every field, <font face='DJM'>aria-required</font>, "
        "<font face='DJM'>aria-invalid</font>, errors linked by <font face='DJM'>aria-describedby</font> and "
        "announced with <font face='DJM'>role=\"alert\"</font>, success via <font face='DJM'>aria-live=\"polite\"</font>, "
        "autofill attributes (<font face='DJM'>name</font>, <font face='DJM'>email</font>, <font face='DJM'>organization</font>).",
        "Mobile menu: focus trap, Escape to close, focus restored to the toggle, <font face='DJM'>aria-expanded</font> kept in sync.",
        "Language: <font face='DJM'>&lt;html lang=\"en\"&gt;</font>; if you add Nigerian-language phrases, wrap them in <font face='DJM'>lang</font> attributes.",
        "Test with the keyboard only, then with VoiceOver (macOS/iOS) or TalkBack (Android), then run axe DevTools and fix every serious/critical finding.",
    ]))

    st.append(h2("8.7  Contact form without a backend"))
    st.append(table(["Option", "Setup", "Pros", "Cons"],
                    [
                        ["<b>Formspree</b> (recommended)", "Create a form, put the endpoint in <font face='DJM'>NEXT_PUBLIC_FORMSPREE_ENDPOINT</font>, POST from a client component or a Route Handler.",
                         "Free tier is enough; built-in spam filtering; dashboard; no server code.",
                         "Third-party dependency; free tier caps submissions/month."],
                        ["Web3Forms", "Access key in env, POST JSON.", "Generous free tier, simple.", "Less mature dashboard."],
                        ["Resend + Route Handler", "Your own <font face='DJM'>POST /api/contact</font> route sending via Resend.",
                         "Full control, no form vendor.", "Needs an API key, rate limiting and validation code you must maintain."],
                        ["mailto fallback (always include)", "A plain link: <font face='DJM'>mailto:...?subject=Project%20enquiry</font>.",
                         "Zero dependencies; works with JS disabled.", "No validation; opens a mail client."],
                    ],
                    widths=[34 * mm, 50 * mm, 40 * mm, CONTENT_W - 124 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(code_block(
        '// src/app/api/contact/route.ts  (Route Handler pattern - no DB, no secrets in client code)\n'
        'import { NextResponse } from "next/server";\n\n'
        "const EMAIL_RE = /^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$/i;\n\n"
        "export async function POST(req: Request) {\n"
        '  const body = await req.json().catch(() => null);\n'
        '  if (!body) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });\n'
        '  const { name, email, org, interest, message, website, startedAt } = body;\n'
        '  if (website) return NextResponse.json({ ok: true });          // honeypot: silent success\n'
        '  if (Date.now() - Number(startedAt) < 3000)                     // too fast to be human\n'
        '    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });\n'
        "  const errors: Record<string,string> = {};\n"
        '  if (!name || String(name).trim().length < 2) errors.name = "Please enter your name.";\n'
        '  if (!EMAIL_RE.test(String(email ?? ""))) errors.email = "Please enter a valid email address.";\n'
        '  if (!interest) errors.interest = "Please choose one option.";\n'
        '  const msg = String(message ?? "").trim();\n'
        "  if (msg.length < 20) errors.message = \"Please add a little more detail (at least 20 characters).\";\n"
        "  if (msg.length > 2000) errors.message = \"Please keep the message under 2000 characters.\";\n"
        '  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });\n\n'
        "  const res = await fetch(process.env.FORM_ENDPOINT!, {\n"
        '    method: "POST",\n'
        '    headers: { "Content-Type": "application/json", Accept: "application/json" },\n'
        "    body: JSON.stringify({ name, email, org, interest, message: msg,\n"
        '      _subject: `Landing page enquiry: ${interest} - ${name}` }),\n'
        "  });\n"
        '  if (!res.ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });\n'
        "  return NextResponse.json({ ok: true });\n"
        "}",
        title="Reference implementation — validation, honeypot and timing check"))
    st.append(callout("warn",
        "<b>Never</b> put a form-provider secret key in a <font face='DJM'>NEXT_PUBLIC_</font> variable, and never "
        "validate only on the client. The endpoint above is the whole contract: validate server-side, reject "
        "silently on the honeypot, return structured field errors, and never echo the submitted message back."))

    st.append(h2("8.8  Analytics and privacy"))
    st.append(bullets([
        "<b>Recommended: Plausible or Umami</b> (both cookie-free, GDPR-friendly, ~1 KB, no consent banner needed). "
        "Track: pageview, scroll depth, outbound link clicks (GitHub, LinkedIn, demos), CV download, form submit, "
        "form success.",
        "If you choose GA4, add a consent banner and a <font face='DJM'>/privacy</font> page — extra work and extra "
        "JavaScript for a personal page.",
        "Never let an analytics script block rendering: load with <font face='DJM'>defer</font> after hydration, or "
        "via <font face='DJM'>next/script</font> with <font face='DJM'>strategy=\"afterInteractive\"</font>.",
        "Measure the Section 2.6 targets monthly; do not add heatmaps or session recording to a page with a phone "
        "number and email on it.",
    ]))

    st.append(h2("8.9  Deployment"))
    st.append(numbered([
        "Push the branch and open a pull request; require <font face='DJM'>tsc --noEmit</font>, lint and vitest to "
        "pass before merge (add a GitHub Actions workflow — the repo currently has none).",
        "Import the repo into Vercel (Hobby plan is fine). Framework preset: Next.js. Build command "
        "<font face='DJM'>npm run build</font>.",
        "Add environment variables in Vercel: <font face='DJM'>FORM_ENDPOINT</font> and, if used, "
        "<font face='DJM'>NEXT_PUBLIC_PLAUSIBLE_DOMAIN</font>.",
        "Attach the custom domain, let Vercel issue the TLS certificate, and set the apex/www 301 redirect.",
        "Enable Vercel Analytics only if you did not choose Plausible/Umami.",
        "Run Lighthouse and PageSpeed Insights against the production URL, not localhost, and record the scores.",
        "Add the URL to Google Search Console + Bing Webmaster, submit the sitemap, and set the LinkedIn profile "
        "\"Website\" field to it so the preview card renders.",
    ]))

    st.append(h2("8.10  Testing plan"))
    st.append(table(["Test", "Type", "What it asserts"],
                    [
                        ["<font face='DJM'>tests/content.test.ts</font>", "Unit (vitest)",
                         "Profile contains name, email, phone, GitHub, LinkedIn, CV path; all four projects have ≥ 1 link and ≥ 2 metrics; no banned word from Section 2.5 appears in any exported string; every external URL starts with https:// (except mailto/tel)."],
                        ["<font face='DJM'>tests/trading-stats.test.ts</font>", "Unit",
                         "Recomputes net P&L, win rate, profit factor, payoff, drawdown and streaks from <font face='DJM'>trades.csv</font> and asserts they equal the published figures (100 trades, +$2,783.61 gross sample, 35.0%, 1.14, 2.05, 40.79%, streak 12). Fails loudly if the CSV and the copy drift apart."],
                        ["<font face='DJM'>tests/seo.test.ts</font>", "Unit",
                         "Title ≤ 60 chars, description 150–158 chars, canonical set, OG image 1200×630 declared, JSON-LD parses and has @type Person with both certificate IDs."],
                        ["Certificate ID integrity", "Unit",
                         "The strings <font face='DJM'>MRC-2026-HKHJULZA</font> and <font face='DJM'>TSWW5QW86KV4MJ</font> appear exactly once each and match character for character."],
                        ["Link check", "Scripted",
                         "Crawl every href on the built page and assert a 200/301 response (run before launch and monthly)."],
                        ["Accessibility", "Manual + automated",
                         "axe DevTools: zero serious/critical. Keyboard-only pass through every section. Screen-reader pass on the hero, charts and form."],
                        ["Visual", "Manual at 6 widths",
                         "320, 375, 768, 1024, 1440, 1920 px. Screenshot each section; compare against Section 4 layouts."],
                        ["Print", "Manual",
                         "Ctrl+P produces a clean 1–2 page résumé-style document with links shown as URLs and no dark backgrounds."],
                    ],
                    widths=[38 * mm, 24 * mm, CONTENT_W - 62 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(code_block(
        'import { describe, expect, it } from "vitest";\n'
        'import { readFileSync } from "node:fs";\n\n'
        "describe(\"published trading figures\", () => {\n"
        '  const rows = readFileSync("docs/landing-page/trades.csv", "utf8")\n'
        '    .trim().split("\\n").slice(1)\n'
        '    .map((l) => { const c = l.split(","); return { pnl: Number(c[7]), bal: Number(c[6]) }; });\n\n'
        '  it("has 100 trades", () => expect(rows).toHaveLength(100));\n'
        '  it("nets +2783.61", () => expect(rows.reduce((s, r) => s + r.pnl, 0).toFixed(2)).toBe("2783.61"));\n'
        '  it("wins 35%", () => {\n'
        "    const w = rows.filter((r) => r.pnl > 0).length;\n"
        '    expect(((w / rows.length) * 100).toFixed(1)).toBe("35.0");\n'
        "  });\n"
        "});",
        title="tests/trading-stats.test.ts — keeps the page honest (verify column indices against trades.csv)"))
    st.append(PageBreak())
