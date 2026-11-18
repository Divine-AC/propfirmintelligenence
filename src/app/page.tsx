import Link from "next/link";
import { firmAccounts } from "@/data/firms";

const steps = [
  { number: "01", title: "Tell us how you trade", description: "Choose your trading style, budget and the rules you need to follow. You can describe your strategy in your own words.", href: "/matches", action: "Start your profile" },
  { number: "02", title: "Add your trade history", description: "Optional: upload a CSV or enter trades manually to add real trading behaviour to your assessment.", href: "/history", action: "Add trades" },
  { number: "03", title: "Review your matches", description: "Search for accounts and see why they fit, which rules need attention and what remains unverified.", href: "/matches", action: "Find my matches" },
];

export default function Home() {
  const firms = new Set(firmAccounts.map((account) => account.firmName)).size;
  return (
    <main className="px-4 pb-20 pt-10 text-white sm:px-8 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div>
            <p className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">A clearer way to choose a prop firm</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-6xl">Find an account that fits <span className="text-cyan-300">how you trade.</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Tell us about your trading. We’ll compare account rules, highlight potential conflicts and help you understand your options before you buy.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/matches" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300">Find my matches <span className="ml-3" aria-hidden="true">→</span></Link>
              <Link href="/compare" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">Compare accounts</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No broker password needed. Trade history is optional.</p>
          </div>
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Your assessment</p><h2 className="mt-2 text-xl font-bold">What you’ll get</h2></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Personalised</span></div>
            <ul className="mt-2 divide-y divide-slate-800">
              {[['A suggested account', 'See the strongest available fit, or why no account is ready to recommend.'], ['Rules in plain English', 'Understand loss limits, trading restrictions and possible conflicts.'], ['Evidence & alternatives', 'Compare costs and check official sources before deciding.']].map(([title, description], index) => <li key={title} className="flex gap-4 py-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-bold text-cyan-300">{index + 1}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div></li>)}
            </ul>
            <div className="rounded-xl bg-slate-950/70 px-4 py-3 text-sm text-slate-400">{firmAccounts.length} account options across {firms} firms · Research snapshot: 29 Oct 2026</div>
          </div>
        </section>
        <section className="mt-20 border-t border-slate-800 pt-12">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Three steps to a clearer decision.</h2>
          <p className="mt-3 text-slate-400">Start with your profile. Add history whenever you’re ready.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step) => <div key={step.number} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><span className="text-sm font-bold text-cyan-300">{step.number}</span><h3 className="mt-4 text-lg font-bold">{step.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{step.description}</p><Link href={step.href} className="mt-5 text-sm font-semibold text-cyan-300 hover:text-cyan-200">{step.action} →</Link></div>)}</div>
        </section>
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm leading-6 text-slate-400">Firm rules and prices can change. Our research is a starting point, not a guarantee of passing or receiving a payout. Verify current terms with the firm before purchasing.</div>
      </div>
    </main>
  );
}
