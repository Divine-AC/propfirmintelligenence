import type { ReactNode } from "react";
import { ChartNoAxesCombined, FileSpreadsheet } from "lucide-react";
import type { TradeHistorySummary, TradeMetrics } from "@/lib/trading-history/types";
import styles from "./performance.module.css";

const precision = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const amount = new Intl.NumberFormat("en-US", precision);
const signed = new Intl.NumberFormat("en-US", { ...precision, signDisplay: "exceptZero" });
const returns = new Intl.NumberFormat("en-US", { ...precision, style: "percent", signDisplay: "exceptZero" });
const winRate = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const known = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);
type Days = TradeMetrics["dailyResults"];

function DailyCurve({ days }: { days: Days }) {
  // One observation per active UTC close day, with a zero baseline before the first close.
  const values = [0, ...days.map((day) => day.cumulativeProfit)];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const y = (v: number) => (high === low ? 40 : 74 - ((v - low) / (high - low)) * 68);
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${(4 + (352 * i) / days.length).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");
  const last = days[days.length - 1];
  const firstDate = dateLabel.format(new Date(days[0].date));
  const lastDate = dateLabel.format(new Date(last.date));
  return (
    <figure className={styles.figure}>
      <figcaption>
        <span>Cumulative P&amp;L</span>
        <span>UTC close days</span>
      </figcaption>
      <svg
        role="img"
        aria-label={`Cumulative P&L from ${firstDate} to ${lastDate}: starts at 0, ranges from ${amount.format(low)} to ${amount.format(high)}, ends at ${signed.format(last.cumulativeProfit)}.`}
        viewBox="0 0 360 80"
        preserveAspectRatio="none"
      >
        <path d="M4,6H356 M4,40H356 M4,74H356" stroke="currentColor" opacity=".12" fill="none" />
        <path d={`M4,${y(0)}H356`} stroke="currentColor" strokeDasharray="3 4" opacity=".55" />
        <path d={`${line} L356,${y(0)} L4,${y(0)} Z`} fill="currentColor" opacity=".12" />
        <path
          d={line}
          stroke="currentColor"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="356" cy={y(last.cumulativeProfit)} r="3.5" fill="currentColor" />
      </svg>
      <div className={styles.dates}>
        <span>{days.length === 1 ? "Start at 0" : firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </figure>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>
        {value}
        <small>{note}</small>
      </dd>
    </div>
  );
}

function Outcomes({
  outcomes,
  total,
}: {
  outcomes: NonNullable<TradeHistorySummary["outcomes"]>;
  total: number;
}) {
  const segments = [
    { name: outcomes.wins === 1 ? "win" : "wins", n: outcomes.wins, color: "#287b61" },
    { name: outcomes.losses === 1 ? "loss" : "losses", n: outcomes.losses, color: "#b4576b" },
    { name: "break-even", n: outcomes.breakeven, color: "#8a9a99" },
  ];
  return (
    <div className={styles.outcomes}>
      <div className={styles.outcomesHead}>
        <h3>Trade outcomes</h3>
        <span>
          {count.format(total)} closed {total === 1 ? "trade" : "trades"}
        </span>
      </div>
      <div className={styles.bar} aria-hidden="true">
        {segments
          .filter((s) => s.n > 0)
          .map((s) => (
            <i key={s.name} style={{ flex: s.n, background: s.color }} />
          ))}
      </div>
      <ul aria-label="Trade outcome counts">
        {segments.map((s) => (
          <li key={s.name}>
            <i aria-hidden="true" style={{ background: s.color }} />
            {count.format(s.n)} {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PerformanceOverview({
  summary,
  days,
  source,
  isPreview,
  note,
  children,
}: {
  summary: TradeHistorySummary;
  days?: Days;
  source: string;
  isPreview: boolean;
  note: string;
  children: ReactNode;
}) {
  const { startingBalance, netProfit, maximumBalanceDrawdown, maximumBalanceDrawdownPct, outcomes } = summary;
  const hasBalance = known(startingBalance) && startingBalance > 0;
  const returnRatio = hasBalance && known(netProfit) ? netProfit / startingBalance : null;
  const tone = !known(netProfit) || netProfit === 0 ? "flat" : netProfit > 0 ? "gain" : "loss";
  return (
    <section
      id="performance-summary"
      aria-labelledby="performance-title"
      tabIndex={-1}
      className={styles.overview}
    >
      <header className={styles.header}>
        <div>
          <p className="eyebrow">
            <span />
            Closed-trade statistics{isPreview ? " / Preview" : ""}
          </p>
          <h2 id="performance-title">Performance overview</h2>
        </div>
        <span className={styles.source}>
          <FileSpreadsheet size={15} aria-hidden="true" />
          <span>{source}</span>
        </span>
      </header>
      <div className={styles.board}>
        <div className={styles.result} data-tone={tone}>
          <dl>
            <dt>Net realized P&amp;L</dt>
            <dd>{known(netProfit) ? signed.format(netProfit) : "—"}</dd>
          </dl>
          <p className={styles.returns}>
            {known(returnRatio) && hasBalance ? (
              <>
                <strong>{returns.format(returnRatio)}</strong> return on {count.format(startingBalance)}{" "}
                starting balance
              </>
            ) : (
              "Return unavailable without P&L and a positive starting balance."
            )}
          </p>
          {days?.length ? (
            <DailyCurve days={days} />
          ) : (
            <p className={styles.savedNote}>
              <ChartNoAxesCombined size={18} aria-hidden="true" />
              Re-import the CSV to see the daily P&amp;L curve. Only summary statistics were saved.
            </p>
          )}
        </div>
        <div className={styles.breakdown}>
          <dl className={styles.metrics}>
            <Stat
              label="Win rate"
              value={known(summary.winRate) ? winRate.format(summary.winRate) : "—"}
              note="Winning trades ÷ all closed trades"
            />
            <Stat
              label="Profit factor"
              value={known(summary.profitFactor) ? `${amount.format(summary.profitFactor)}×` : "—"}
              note={
                known(summary.profitFactor)
                  ? "Total gains ÷ total losses"
                  : "Requires at least one losing trade"
              }
            />
            <Stat
              label="Expectancy"
              value={known(summary.expectancy) ? signed.format(summary.expectancy) : "—"}
              note="Average net P&L per closed trade"
            />
            <Stat
              label="Max balance drawdown"
              value={
                known(maximumBalanceDrawdown)
                  ? amount.format(maximumBalanceDrawdown)
                  : known(maximumBalanceDrawdownPct)
                    ? `${amount.format(maximumBalanceDrawdownPct)}%`
                    : "—"
              }
              note={
                known(maximumBalanceDrawdown) && known(maximumBalanceDrawdownPct)
                  ? `${amount.format(maximumBalanceDrawdownPct)}% of starting balance · at closes`
                  : "Peak to trough at trade closes"
              }
            />
          </dl>
          {outcomes && <Outcomes outcomes={outcomes} total={summary.tradeCount} />}
        </div>
      </div>
      <footer className={styles.footer}>
        <p>{note}</p>
        <div>{children}</div>
      </footer>
    </section>
  );
}
