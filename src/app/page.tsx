import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartCandlestick,
  Columns3,
  Crosshair,
  FolderClosed,
  Layers3,
  Radar,
  Wallet,
} from "lucide-react";
import { firmAccounts } from "@/data/firms";
import { ToolGraphic } from "@/components/ToolGraphic";

const tools = [
  {
    kind: "match",
    href: "/matches",
    icon: Crosshair,
    title: "Strategy matcher",
    description: "Find accounts that align with your trading style, budget, and risk preferences.",
    action: "Build your profile",
  },
  {
    kind: "history",
    href: "/history",
    icon: ChartCandlestick,
    title: "Trade diagnostics",
    description: "Turn your closed trades into a clear picture of performance, drawdown, and risk.",
    action: "Analyze trade history",
  },
  {
    kind: "compare",
    href: "/compare",
    icon: Columns3,
    title: "Account comparison",
    description: "Compare fees, loss limits, and trading rules across programmes, side by side.",
    action: "Compare accounts",
  },
] as const;

const firms = [...new Set(firmAccounts.map((account) => account.firmName))];
const compactSize = (size: number) => `$${size / 1000}K`;
const snapshot = firmAccounts
  .map((account) => account.accountSizeEvidence.verifiedAt ?? "")
  .sort()
  .at(-1);
const snapshotDate = snapshot
  ? new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(snapshot))
  : "Not dated";
const stats = [
  { icon: Layers3, value: firmAccounts.length, label: "Researched accounts" },
  { icon: Building2, value: String(firms.length).padStart(2, "0"), label: "Prop firms covered" },
  {
    icon: Wallet,
    value: compactSize(Math.max(...firmAccounts.map((a) => a.accountSize))),
    label: "Largest account size",
  },
  { icon: CalendarDays, value: snapshotDate, label: "Research snapshot" },
];

export default function Home() {
  return (
    <main className="shell dashboard">
      <section className="overview-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-kicker">
            <Radar size={14} /> Research terminal
          </p>
          <h1 id="hero-title">
            Your strategy.
            <br />
            <span>The right prop firm.</span>
          </h1>
          <p className="hero-deck">
            Find an account that fits how you trade. Compare firm rules, understand the trade-offs, and choose
            with clarity.
          </p>
          <div className="hero-actions">
            <Link href="/matches" className="btn btn-mint">
              Find my matches <ArrowRight size={16} />
            </Link>
            <Link href="/compare" className="btn btn-hero-secondary">
              <Columns3 size={16} />
              Compare accounts
            </Link>
          </div>
        </div>
        <figure
          className="hero-figure"
          aria-label="Illustration of the four firms in our research catalogue: FTMO, FundedNext, The5ers, and BrightFunded."
        >
          <Image
            src="/research-globe.svg"
            width={550}
            height={335}
            alt=""
            unoptimized
            preload
            className="research-globe"
          />
          <figcaption>
            <span className="fig-line" />
            Fig. 01 <b>/</b> Firm research network
          </figcaption>
        </figure>
      </section>

      <section className="research-stats" aria-label="Research coverage at a glance">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="stat" key={label}>
            <span className="stat-icon">
              <Icon size={20} />
            </span>
            <dl>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </dl>
          </div>
        ))}
      </section>

      <section className="tool-section" aria-labelledby="tools-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              Workspace tools
            </p>
            <h2 id="tools-title">Your research toolkit</h2>
          </div>
          <Link href="/reports" className="quiet-link">
            <FolderClosed size={15} />
            Saved reports <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="tools-grid">
          {tools.map(({ kind, href, icon: Icon, title, description, action }, index) => (
            <Link
              href={href}
              className={`tool-card tool-${kind}`}
              key={kind}
              aria-labelledby={`tool-${kind}`}
            >
              <div className="tool-art">
                <span className="tool-icon">
                  <Icon size={23} strokeWidth={1.6} />
                </span>
                <ToolGraphic kind={kind} />
              </div>
              <div className="tool-body">
                <p className="tool-index">Module / 0{index + 1}</p>
                <h3 id={`tool-${kind}`}>{title}</h3>
                <p className="tool-description">{description}</p>
              </div>
              <div className="tool-action">
                {action}
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="coverage-section" aria-labelledby="coverage-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              The catalogue
            </p>
            <h2 id="coverage-title">Research coverage</h2>
          </div>
          <Link href="/compare" className="quiet-link">
            Compare programmes <ArrowRight size={14} />
          </Link>
        </div>
        <div className="coverage-grid">
          {firms.map((firm, index) => {
            const accounts = firmAccounts.filter((account) => account.firmName === firm);
            const sizes = accounts.map((account) => account.accountSize);
            const source = accounts[0].accountSizeEvidence.sourceUrl;
            return (
              <article className="coverage-item" key={firm}>
                <p className="coverage-number">Firm / 0{index + 1}</p>
                <h3>{firm}</h3>
                <p>
                  {accounts.length} accounts <span>·</span> {compactSize(Math.min(...sizes))}–
                  {compactSize(Math.max(...sizes))}
                </p>
                {source && (
                  <a href={source} target="_blank" rel="noreferrer">
                    Official programme source <ArrowUpRight size={13} />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
