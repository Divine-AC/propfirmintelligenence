import type { FirmAccount, TradingStyle } from "@/lib/matching/types";

const checked = <T>(value: T, sourceUrl: string, note?: string) => ({
  value,
  status: "verified" as const,
  sourceUrl,
  verifiedAt: "2026-10-29",
  ...(note ? { note } : {}),
});
const unknown = <T>(value: T, note?: string) => ({
  value,
  status: "unverified" as const,
  ...(note ? { note } : {}),
});

const source = {
  ftmoPrice: "https://ftmo.com/en/1-step-challenge/",
  ftmoObjectives: "https://ftmo.com/en/trading-objectives/",
  ftmoRules: "https://ftmo.com/en/comparison-table/",
  ftmoNews: "https://ftmo.com/faq/can-i-trade-news/",
  ftmoHolding: "https://ftmo.com/en/faq/can-i-hold-positions-overnight-or-over-the-weekend/",
  ftmoPayout: "https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/",
  ftmoFees: "https://ftmo.com/faq/is-the-entry-fee-refunded/",
  ftmoStyles: "https://ftmo.com/en/faq/which-instruments-can-i-trade-and-what-strategies-am-i-allowed-to-use/",
  fundedPrice: "https://help.fundednext.com/en/articles/17560173-what-is-the-fundednext-stellar-october-returns-offer",
  fundedPlan: "https://help.fundednext.com/en/articles/17255124-stellar-2-step-challenge",
  fundedDaily: "https://help.fundednext.com/en/articles/9941519-daily-loss-limit-vs-maximum-loss-limit",
  fundedHolding: "https://help.fundednext.com/en/articles/11982358-does-fundednext-allow-holding-trades-over-the-night-weekend",
  fundedNews: "https://help.fundednext.com/en/articles/10701447-is-news-trading-allowed-at-fundednext",
  fundedPayout: "https://help.fundednext.com/en/articles/9929008-what-happens-when-the-trading-cycle-ends",
  fundedStyles: "https://help.fundednext.com/en/articles/11982310-is-scalping-allowed-at-fundednext",
  fundedSizes: "https://help.fundednext.com/en/articles/17255124-stellar-2-step-challenge",
  fivePrice: "https://the5ers.com/high-stakes/",
  fiveSizes: "https://the5ers.com/faqs/how-many-the5ers-accounts-can-i-have/",
  fiveRisk: "https://the5ers.com/faqs/what-is-the-drawdown-rule-for-high-stakes/",
  fiveRules: "https://the5ers.com/faqs/what-are-the-general-rules-for-the-high-stakes-program/",
  fivePayout: "https://the5ers.com/faqs/payout-policy-and-hub-credit-in-the-high-stakes-program/",
  ftmoTwoPrice: "https://ftmo.com/en/2-step-challenge/",
  ftmoTwoRules: "https://ftmo.com/en/comparison-table/",
  ftmoTwoFee: "https://ftmo.com/en/faq/is-the-entry-fee-refunded/",
  brightHome: "https://brightfunded.com/",
  brightPlan: "https://brightfunded.com/comparison-table",
  brightRules: "https://help.brightfunded.com/en/articles/9241590-how-do-i-get-funded",
  brightDrawdown: "https://help.brightfunded.com/en/articles/14284817-brightfunded-2-step-bright",
  brightNews: "https://help.brightfunded.com/en/articles/12000749-the-most-frequently-asked-general-questions",
};

const supportedStyles = ["scalping", "intraday", "swing", "news"] satisfies TradingStyle[];

// Research snapshot: 2026-10-29. A value is verified only where an official
// source identifies the named product. Phase and funded-account differences
// are called out in notes rather than collapsed into one favourable rule.
export const firmAccounts: FirmAccount[] = [
  {
    id: "ftmo-1-step-10k",
    firmName: "FTMO",
    programmeName: "FTMO Challenge: 1-Step · $10,000",
    accountSize: 10_000,
    accountSizeEvidence: checked(10_000, source.ftmoPrice),
    priceCurrency: "EUR",
    price: checked(79, source.ftmoPrice, "Published one-time price for the $10,000 size; check the checkout for regional taxes or a live promotion."),
    basePrice: checked(79, source.ftmoPrice),
    evaluationPhases: checked(1, source.ftmoRules),
    profitTargetsPct: checked([10], source.ftmoObjectives),
    dailyLossLimitPct: checked(3, source.ftmoObjectives),
    overallLossLimitPct: checked(10, source.ftmoObjectives),
    lossCalculation: checked("The daily limit is 3% of initial capital. At 00:00 CE(S)T the limit resets from the prior day's closing balance. It includes closed and floating P/L, commissions, and swaps. The 10% overall limit trails upward using the highest end-of-day balance and never moves down; equity, commissions, and swaps count against its floor.", source.ftmoObjectives),
    dailyReset: checked("00:00 Central European (Summer) Time", source.ftmoObjectives),
    minimumTradingDays: checked("No minimum trading days", source.ftmoRules),
    timeLimit: checked("Unlimited", source.ftmoObjectives),
    drawdownType: checked<"trailing">("trailing", source.ftmoRules, "End-of-day trailing overall loss limit."),
    newsRule: checked("During the 1-Step Challenge evaluation, news trading is unrestricted. On the resulting Standard FTMO Account, orders on affected instruments are restricted from 2 minutes before to 2 minutes after selected releases; open positions may be held if opened outside that window.", source.ftmoNews),
    newsExecution: checked<"restricted">("restricted", source.ftmoNews, "Unrestricted in Challenge evaluation; selected-news execution window applies after funding."),
    automationRule: checked<"restricted">("restricted", source.ftmoStyles, "EAs are permitted subject to legitimate-strategy, platform activity, and capital-allocation rules."),
    weekendHolding: checked<"allowed">("allowed", source.ftmoHolding, "Allowed during the Challenge evaluation. The 1-Step product provides Standard account type; its later funded account restricts holding through market breaks longer than 2 hours."),
    weekendRule: checked("Allowed during evaluation. On a Standard FTMO Account, close positions before market breaks longer than 2 hours; the Swing exception is not available for 1-Step.", source.ftmoHolding),
    consistencyRule: checked<"present">("present", source.ftmoObjectives),
    consistencyDetails: checked("Best Day must be no more than 50% of Positive Days' Profit. If above the threshold, this is not an automatic breach: more qualifying profit must be generated before passing or requesting a reward.", source.ftmoObjectives),
    supportedStyles: checked(supportedStyles, source.ftmoStyles, "The firm allows legitimate strategies subject to its prohibited-practice and risk rules."),
    payoutTerms: checked("90% of simulated profit. A reward request can be made on or after day 14 from the first trade; open positions and pending orders must be closed. FTMO reviews requests before payment.", source.ftmoPayout),
    profitSplit: checked("90%", source.ftmoPayout),
    feeTerms: checked("€79 one-time fee. The 1-Step fee is not refundable; FTMO says there are no recurring fees.", source.ftmoFees),
    otherRestrictions: checked("Trading methods must be legitimate and replicable; prohibited practices and platform activity limits apply.", source.ftmoStyles),
  },
  {
    id: "fundednext-stellar-2-step-6k",
    firmName: "FundedNext",
    programmeName: "Stellar 2-Step · $6,000",
    accountSize: 6_000,
    accountSizeEvidence: checked(6_000, source.fundedSizes),
    priceCurrency: "USD",
    price: checked(39.99, source.fundedPrice, "Published global October offer price with code STRTN; offer can end without notice. Checkout region, code eligibility, and add-ons can change the payable amount."),
    basePrice: checked(59.99, source.fundedPlan, "Published approximate base price before coupon, add-ons, or regional checkout differences."),
    evaluationPhases: checked(2, source.fundedPlan),
    profitTargetsPct: checked([8, 5], source.fundedPlan),
    dailyLossLimitPct: checked(5, source.fundedDaily),
    overallLossLimitPct: checked(10, source.fundedDaily),
    lossCalculation: checked("The daily allowance starts at 5% of initial balance and changes with that day's realized result; closed and floating losses count. The daily limit resets at midnight server time. The overall floor is 90% of initial balance and does not trail upward with profits; balance or equity below that floor breaches the rule.", source.fundedDaily),
    dailyReset: checked("00:00 server time (seasonally GMT+2 or GMT+3)", source.fundedDaily),
    minimumTradingDays: checked("5 separate calendar days per phase", source.fundedPlan, "A no-minimum-days add-on is offered for this $6K size and is not included in the listed fee."),
    timeLimit: checked("Unlimited", source.fundedPlan),
    drawdownType: checked<"static">("static", source.fundedDaily, "The overall floor remains 90% of initial balance."),
    newsRule: checked("News trades are allowed during the Challenge. On a funded account, profitable executions within 5 minutes before or after a correlated high-impact release count at 40% toward account profit; losses remain fully counted.", source.fundedNews),
    newsExecution: checked<"restricted">("restricted", source.fundedNews, "Challenge phase allows news execution; funded account has a reward-share adjustment for specified news trades."),
    automationRule: checked<"restricted">("restricted", source.fundedPlan, "EAs are allowed below $50K subject to settings and policies; they are not permitted at $50K and above."),
    weekendHolding: checked<"allowed">("allowed", source.fundedHolding, "Swap charges still apply in standard accounts and count toward daily loss."),
    weekendRule: checked("Overnight and weekend holding are allowed. Swap charges, including triple-swap days, affect P/L and the daily loss calculation unless a swap-free add-on is selected.", source.fundedHolding),
    consistencyRule: unknown<"unknown">("unknown", "Payout option changes the consistency conditions; user has not selected an option. Quick Strike is separately documented and is shown below."),
    consistencyDetails: unknown<string | null>(null, "Payout option must be selected to evaluate payout consistency: the On-Demand option has a 40% best-day condition."),
    supportedStyles: checked(supportedStyles, source.fundedStyles, "Scalping is allowed, but tick scalping is prohibited. The firm also lists prohibited strategies and execution practices."),
    payoutTerms: checked("The selected option controls payouts: Standard begins with a 21-day cycle then 14-day cycles; 3-Day requires three profitable days each at 1% minimum; On-Demand requires 2% growth and a best day no greater than 40% of profit. Selection is made at checkout.", source.fundedPayout),
    profitSplit: checked("80% on Standard 21-Day; 60% on 3-Day; 90% on On-Demand, before any optional add-on or later scale-up.", source.fundedPayout),
    feeTerms: checked("Published base fee $59.99; current listed global offer $39.99 with coupon STRTN, subject to offer expiry. FundedNext describes the purchase amount as a Refundable Fee available with the first Performance Reward; optional add-ons cost extra.", source.fundedPrice),
    otherRestrictions: checked("Quick Strike trades closed within 30 seconds must stay below 30% under the Challenge requirement. EAs are not permitted at $50K and above; check the full prohibited-strategy policy for other restrictions.", source.fundedPlan),
  },
  {
    id: "the5ers-high-stakes-2500",
    firmName: "The5ers",
    programmeName: "High Stakes · $2,500",
    accountSize: 2_500,
    accountSizeEvidence: checked(2_500, source.fivePrice),
    priceCurrency: "USD",
    price: checked(19, source.fivePrice, "Published entry price on the High Stakes page; checkout terms may vary."),
    basePrice: checked(19, source.fivePrice),
    evaluationPhases: checked(2, source.fivePrice),
    profitTargetsPct: checked([10, 5], source.fivePrice),
    dailyLossLimitPct: checked(5, source.fiveRisk),
    overallLossLimitPct: checked(10, source.fiveRisk),
    lossCalculation: checked("The 10% maximum loss is measured from initial balance. The daily 5% is recalculated at 00:00 server time from the previous day's closing balance or equity, whichever is higher; floating equity is therefore relevant.", source.fiveRisk),
    dailyReset: checked("00:00 server time", source.fiveRisk),
    minimumTradingDays: checked("3 profitable days per evaluation phase", source.fivePrice, "A profitable day uses the programme's own closed-profit definition; it is not merely any day on which a trade is placed."),
    timeLimit: checked("Unlimited, with a 30-day inactivity expiry for evaluation accounts", source.fiveRules),
    drawdownType: checked<"static">("static", source.fiveRisk, "Absolute overall loss from initial balance; daily loss reference is recalculated daily."),
    newsRule: checked("Holding through news is allowed, but executing orders from 2 minutes before through 2 minutes after high-impact events is prohibited; profits in that window do not count toward target.", source.fiveRules),
    newsExecution: checked<"restricted">("restricted", source.fiveRules),
    automationRule: unknown<"unknown">("unknown", "Automation and EA policy for this specific account has not been verified."),
    weekendHolding: checked<"allowed">("allowed", source.fivePrice),
    weekendRule: checked("Overnight and weekend holding are allowed; holding indices over weekends can incur high swap charges.", source.fivePrice),
    consistencyRule: unknown<"unknown">("unknown", "A consistency rule for the $2.5K High Stakes account was not confirmed in the inspected official terms."),
    consistencyDetails: unknown<string | null>(null),
    supportedStyles: unknown<TradingStyle[]>([], "No account-specific supported-style list was confirmed."),
    payoutTerms: checked("Payouts begin only after funding and are requested every 14 days. The inspected payout source publishes payout caps and minimum P&L only for $50K and $100K sizes, so those amounts are unknown for this $2.5K account.", source.fivePayout),
    profitSplit: checked("Starts at 80% and can increase through the published scaling plan; the exact stage depends on meeting its targets and profitable-day conditions.", "https://the5ers.com/faqs/how-much-is-the-profit-split-in-the5ers/"),
    feeTerms: unknown<string | null>(null, "The checkout and current payout policy do not establish the exact refund applicable to this $2.5K price."),
    otherRestrictions: checked("Orders executed during the 2-minute high-impact news window are restricted. The program expires after 30 consecutive inactive days during evaluation.", source.fiveRules),
  },
];

type SizePrice = { size: number; amount: number | null; baseAmount?: number | null; currency: "EUR" | "USD"; sourceUrl: string; note?: string };

function sizedVariant(base: FirmAccount, entry: SizePrice): FirmAccount {
  const sizeLabel = `$${entry.size.toLocaleString("en-US")}`;
  const sizeCode = entry.size >= 1000 && entry.size % 1000 === 0 ? `${entry.size / 1000}k` : String(entry.size);
  return {
    ...base,
    id: `${base.id.replace(/-\d+k$/, "")}-${sizeCode}`,
    programmeName: base.programmeName.replace(/\$[\d,]+/, sizeLabel),
    accountSize: entry.size,
    accountSizeEvidence: checked(entry.size, entry.sourceUrl),
    priceCurrency: entry.currency,
    price: entry.amount === null ? unknown<number | null>(null, entry.note) : checked(entry.amount, entry.sourceUrl, entry.note),
    basePrice: entry.amount === null ? unknown<number | null>(null, entry.note) : checked(entry.baseAmount ?? entry.amount, entry.sourceUrl),
  };
}

const ftmoOneStep = firmAccounts[0];
const ftmoTwoStepBase: FirmAccount = {
  ...ftmoOneStep,
  id: "ftmo-2-step-10k",
  programmeName: "FTMO Challenge: 2-Step · $10,000",
  accountSizeEvidence: checked(10_000, source.ftmoTwoPrice),
  price: checked(89, source.ftmoTwoPrice),
  basePrice: checked(89, source.ftmoTwoPrice),
  evaluationPhases: checked(2, source.ftmoTwoRules),
  profitTargetsPct: checked([10, 5], source.ftmoTwoRules),
  dailyLossLimitPct: checked(5, source.ftmoTwoRules),
  lossCalculation: checked("The maximum loss is static at 10% of initial balance. Daily loss is 5%; the exact daily reference and reset mechanics are described in FTMO's objectives page.", source.ftmoObjectives),
  minimumTradingDays: checked("4 trading days", source.ftmoTwoRules),
  drawdownType: checked<"static">("static", source.ftmoTwoRules),
  consistencyRule: checked<"absent">("absent", source.ftmoTwoRules),
  consistencyDetails: checked("The comparison table lists no Best Day rule for 2-Step.", source.ftmoTwoRules),
  payoutTerms: checked("Up to 90% of simulated profit. Reward timing and eligibility follow FTMO's withdrawal conditions; the initial share and later increases depend on the applicable scaling terms.", source.ftmoPayout),
  profitSplit: checked("Up to 90%; exact initial and scaled share depends on applicable FTMO terms.", source.ftmoPayout),
  feeTerms: checked("One-time challenge fee, refundable in full with the first reward withdrawal under the 2-Step terms.", source.ftmoTwoFee),
  newsRule: checked("News trading is unrestricted during Challenge and Verification. On the resulting Standard FTMO Account, selected news events have execution restrictions.", source.ftmoNews),
  newsExecution: checked<"restricted">("restricted", source.ftmoNews, "Evaluation is unrestricted; selected-event restrictions apply on the funded Standard account."),
  weekendRule: checked("Weekend holding is allowed during evaluation. Funded Standard accounts have market-break restrictions; Swing account conditions differ.", source.ftmoHolding),
};

const brightFundedNextBase: FirmAccount = {
  ...ftmoTwoStepBase,
  id: "brightfunded-2-step-bright-5k",
  firmName: "BrightFunded",
  programmeName: "2-Step Bright · $5,000",
  accountSize: 5_000,
  accountSizeEvidence: checked(5_000, source.brightPlan),
  priceCurrency: "EUR",
  price: checked(32.90, source.brightHome, "Official page currently shows €32.90 after a 30% offer, from €47 standard; promotion can change."),
  basePrice: checked(47, source.brightHome),
  evaluationPhases: checked(2, source.brightPlan),
  profitTargetsPct: checked([8, 5], source.brightRules),
  dailyLossLimitPct: checked(4, source.brightRules),
  overallLossLimitPct: checked(8, source.brightRules),
  lossCalculation: checked("Maximum loss is static from the original account balance. Daily loss is measured from the higher of balance or equity at the start of the day; closed and floating P/L therefore affect the daily floor.", source.brightRules),
  dailyReset: checked("Daily reset occurs in the CET rollover window, between 23:30 and 23:59 CET.", source.brightNews),
  minimumTradingDays: checked("5 trading days", source.brightPlan),
  timeLimit: checked("Unlimited", source.brightRules),
  drawdownType: checked<"static">("static", source.brightRules),
  newsRule: checked("The published plan comparison lists a 5-minute high-impact news restriction. Check the official terms for affected events, instruments, and phase-specific application.", source.brightPlan),
  newsExecution: checked<"restricted">("restricted", source.brightPlan, "The comparison page lists a 5-minute restriction; detailed event conditions should be confirmed in current terms."),
  automationRule: unknown<"unknown">("unknown", "The exact EA conditions for this plan have not been fully verified."),
  weekendHolding: unknown<"unknown">("unknown", "Weekend holding terms for this exact plan were not confirmed in the inspected official sources."),
  weekendRule: unknown<string | null>(null, "Weekend holding terms for this exact plan were not confirmed in the inspected official sources."),
  consistencyRule: checked<"absent">("absent", source.brightPlan),
  consistencyDetails: checked("The published comparison table lists no consistency rule.", source.brightPlan),
  supportedStyles: checked(supportedStyles, source.brightHome, "The official site says traders can use their own style; prohibited tactics and funded-stage rules still apply."),
  payoutTerms: checked("The plan advertises 24-hour payouts and up to 90%; exact payout ratio depends on the selected add-ons and account terms.", source.brightPlan),
  profitSplit: checked("Up to 90% on this plan; add-ons can change the payout ratio.", source.brightPlan),
  feeTerms: checked("One-time evaluation fee; no mandatory recurring fees. A 100% challenge-fee refund add-on is available and is not included in this base price.", "https://help.brightfunded.com/en/articles/9241687-what-other-fees-do-i-need-to-pay-is-the-fee-recurrent"),
  otherRestrictions: checked("BrightFunded states that its funded accounts have a standard high-impact news restriction. Exact execution and eligibility terms should be checked in the current agreement.", source.brightNews),
};

// Add independently selectable account sizes. Rules are shared only where
// the official programme page states they apply across that programme; prices
// remain size-specific and temporary discounts are kept out of base prices.
firmAccounts.push(
  ...[
    { size: 25_000, amount: 199, currency: "EUR" as const, sourceUrl: source.ftmoPrice },
    { size: 50_000, amount: 319, currency: "EUR" as const, sourceUrl: source.ftmoPrice },
    { size: 100_000, amount: 399, baseAmount: 499, currency: "EUR" as const, sourceUrl: source.ftmoPrice, note: "Published current offer; €499 is the standard fee shown crossed out and the promotion may change." },
    { size: 200_000, amount: 999, currency: "EUR" as const, sourceUrl: source.ftmoPrice },
  ].map((entry) => sizedVariant(ftmoOneStep, entry)),
  ftmoTwoStepBase,
  ...[
    { size: 25_000, amount: 250, currency: "EUR" as const, sourceUrl: source.ftmoTwoPrice },
    { size: 50_000, amount: 345, currency: "EUR" as const, sourceUrl: source.ftmoTwoPrice },
    { size: 100_000, amount: 439, baseAmount: 540, currency: "EUR" as const, sourceUrl: source.ftmoTwoPrice, note: "Published current offer; €540 is the standard fee shown crossed out and the promotion may change." },
    { size: 200_000, amount: 1_080, currency: "EUR" as const, sourceUrl: source.ftmoTwoPrice },
  ].map((entry) => sizedVariant(ftmoTwoStepBase, entry)),
  ...[
    { size: 15_000, amount: 119.99, currency: "USD" as const, sourceUrl: source.fundedSizes },
    { size: 25_000, amount: 199.99, currency: "USD" as const, sourceUrl: source.fundedSizes },
    { size: 50_000, amount: 299.99, currency: "USD" as const, sourceUrl: source.fundedSizes, note: "Expert Advisors are not permitted at $50K or above under current published rules." },
    { size: 100_000, amount: 549.99, currency: "USD" as const, sourceUrl: source.fundedSizes, note: "Expert Advisors are not permitted at $50K or above under current published rules." },
    { size: 200_000, amount: null, currency: "USD" as const, sourceUrl: source.fundedSizes, note: "The current plan page lists about $999.99, while a separate official reset/pricing article lists $1,099.99 as the original purchase price. Price is left unverified until the discrepancy is resolved. EAs are not permitted on accounts of $50K and above." },
  ].map((entry) => {
    const variant = sizedVariant(firmAccounts[1], entry);
    if (entry.size >= 50_000) variant.automationRule = checked<"prohibited">("prohibited", source.fundedSizes, "EA use is not permitted on accounts of $50,000 and above.");
    return variant;
  }),
  ...[
    { size: 5_000, amount: null, currency: "USD" as const, sourceUrl: source.fiveSizes, note: "Official source confirms this High Stakes size, but its current purchase price was not confirmed." },
    { size: 10_000, amount: null, currency: "USD" as const, sourceUrl: source.fiveSizes, note: "Official source confirms this High Stakes size, but its current purchase price was not confirmed." },
    { size: 25_000, amount: null, currency: "USD" as const, sourceUrl: source.fiveSizes, note: "Official source confirms this High Stakes size, but its current purchase price was not confirmed." },
    { size: 50_000, amount: null, currency: "USD" as const, sourceUrl: source.fiveSizes, note: "Official source confirms this High Stakes size, but its current purchase price was not confirmed." },
    { size: 100_000, amount: null, currency: "USD" as const, sourceUrl: source.fiveSizes, note: "Official source confirms this High Stakes size, but its current purchase price was not confirmed." },
  ].map((entry) => {
    const variant = sizedVariant(firmAccounts[2], entry);
    variant.feeTerms = unknown<string | null>(null, entry.note);
    if (entry.size >= 50_000) variant.payoutTerms = checked("Funded payouts are available every 14 days. The published policy lists a $3,000 cap and $300 minimum P&L at $50K, and a $4,000 cap and $500 minimum P&L at $100K.", source.fivePayout);
    return variant;
  }),
  ...[
    { size: 10_000, amount: 60.90, baseAmount: 87, currency: "EUR" as const, sourceUrl: source.brightHome, note: "Official page currently shows €60.90 after a 30% offer, from €87 standard; promotion can change." },
    { size: 25_000, amount: 130.90, baseAmount: 187, currency: "EUR" as const, sourceUrl: source.brightHome, note: "Official page currently shows €130.90 after a 30% offer, from €187 standard; promotion can change." },
    { size: 50_000, amount: 193.90, baseAmount: 277, currency: "EUR" as const, sourceUrl: source.brightHome, note: "Official page currently shows €193.90 after a 30% offer, from €277 standard; promotion can change." },
    { size: 100_000, amount: 333.90, baseAmount: 477, currency: "EUR" as const, sourceUrl: source.brightHome, note: "Official page currently shows €333.90 after a 30% offer, from €477 standard; promotion can change." },
    { size: 200_000, amount: 662.90, baseAmount: 947, currency: "EUR" as const, sourceUrl: source.brightHome, note: "Official page currently shows €662.90 after a 30% offer, from €947 standard; promotion can change." },
  ].map((entry) => sizedVariant(brightFundedNextBase, entry)),
);

