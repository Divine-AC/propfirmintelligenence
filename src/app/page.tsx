export default function Home() {
  return <main className="min-h-screen bg-slate-950 px-5 py-14 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">PropFirm Intelligence</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Choose a prop firm with evidence from your trading.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">Compare account rules against your preferences, and inspect what your closed trades reveal. Recommendations are meant to explain their evidence and their unknowns.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-2">
      <a href="/matches" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7 transition hover:border-cyan-400"><p className="text-sm font-semibold text-cyan-300">Build a profile</p><h2 className="mt-3 text-2xl font-semibold">Compare account programmes</h2><p className="mt-3 leading-7 text-slate-400">Set your style, budget, drawdown preference, and holding needs to see documented compatibility and unresolved rules.</p><span className="mt-6 inline-block font-semibold">Open matches →</span></a>
      <a href="/history" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7 transition hover:border-cyan-400"><p className="text-sm font-semibold text-cyan-300">Optional · private in this tab</p><h2 className="mt-3 text-2xl font-semibold">Analyze trading history</h2><p className="mt-3 leading-7 text-slate-400">Import a closed-trade CSV for realized performance metrics, with estimates clearly separated from what the data can prove.</p><span className="mt-6 inline-block font-semibold">Analyze a CSV →</span></a>
    </div>
    <p className="mt-10 max-w-3xl text-sm leading-6 text-slate-500">Trade-history analysis is optional. A realized-trade export cannot show floating losses or establish every firm-specific rule breach, so results identify those limits explicitly.</p>
  </div></main>;
}
