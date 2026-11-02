# PropFirm Intelligence

Local MVP for explainable Forex/CFD prop-firm matching and optional trading-history analysis.

## Trade-history import

Open `/history` or select **Analyze your trading history** from `/matches`. Choose a UTF-8 CSV no larger than 5 MB or 10,000 trades. The importer suggests column mappings; confirm them in the preview. Required data are instrument, direction, entry/exit timestamps, and profit. Timestamps must be ISO date/time values with an explicit timezone. Optional columns include commission, swap, risk amount, trade ID, balance, and equity.

Review invalid and duplicate rows before analyzing. Only valid unique trades are included, and the report states how many rows were excluded. Files are read in the browser tab and are not uploaded or saved by this page.

The report includes net P&L, win rate, profit factor, expectancy, payoff ratio, frequency, holding duration, streaks, instrument/direction/weekday breakdowns, daily results, and drawdown. Balance drawdown is observed at exported rows when balance is mapped; otherwise it is estimated from closed trades. Equity drawdown uses sampled equity rows and cannot reveal the maximum floating loss between snapshots. Daily groupings use UTC, which may differ from a firm's session boundary.

After analysis, **Use history in firm search** saves only trade count, average holding time, and average active-week frequency in this browser. `/matches` uses those aggregates to suggest a structured trading style and trade frequency. Review those suggestions and press **Search prop firms** to run matching. The original CSV and trade rows are not stored. This is a basic history link; it does not yet simulate firm-specific rules against every historical trade.

These metrics describe the imported historical sample and do not predict future performance or prove that an account would have passed an evaluation.

## Firm account research and search

The profile form has strategy notes, style and risk preferences, budget currency, minimum account size, weekend holding, news and automation preferences, and an explicit search action. The research catalogue currently contains 27 account-size/programme records across four firms: FTMO 1-Step and 2-Step (through $200K), FundedNext Stellar 2-Step (through $200K), The5ers High Stakes (through $100K), and BrightFunded 2-Step Bright (through $200K). Size variants are separate account records. Prices are size-specific and sourced; promotional prices are distinguished from standard fees. The5ers prices above $2.5K and FundedNext's $200K price are left unverified because current official documentation did not establish an unambiguous fee. This is a first researched catalogue, not a comprehensive market list.

Research snapshot checked 2026-10-29 against official programme pages and help centres, including [FTMO 1-Step](https://ftmo.com/en/1-step-challenge/), [FTMO 2-Step](https://ftmo.com/en/2-step-challenge/), [FundedNext Stellar 2-Step](https://help.fundednext.com/en/articles/17255124-stellar-2-step-challenge), [FundedNext current offer](https://help.fundednext.com/en/articles/17560173-what-is-the-fundednext-stellar-october-returns-offer), [The5ers High Stakes](https://the5ers.com/high-stakes/), [The5ers drawdown rules](https://the5ers.com/faqs/what-is-the-drawdown-rule-for-high-stakes/), and [BrightFunded's plan comparison](https://brightfunded.com/comparison-table). Each verified rule stores its own source URL and date. The catalog is intentionally an initial researched set, not a complete firm market database. Unknowns—including The5ers larger account fees and account-specific automation/style/consistency details, and a FundedNext $200K fee discrepancy—remain explicitly marked unverified.

Manual trade entry, configurable account-size selection, complete account-specific instrument and geographic coverage, firm-specific historical rule simulation, saved reports, and session/time-of-day analytics are not implemented yet. Authentication/sign-up is deferred until a real auth and secure persistence service is selected; this local MVP does not collect passwords or send trade data to a server.

## Development

Run `npm run dev` for local development. Run `npm test` for matching and trade-history tests, and `npx tsc --noEmit` for TypeScript checks.
