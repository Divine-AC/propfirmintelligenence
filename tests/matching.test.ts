import { describe, expect, it } from "vitest";
import { checkEligibility } from "../src/lib/matching/eligibility";
import { MATCH_WEIGHTS, scoreAccount } from "../src/lib/matching/scoring";
import { firmAccounts } from "../src/data/firms";
import { assessAccount, decidePrimaryRecommendation, estimateSequentialLossExposure } from "../src/lib/matching/advisory";
import type { FirmAccount, TraderProfile } from "../src/lib/matching/types";

const trader: TraderProfile = {
  strategyDescription: "",
  tradingStyle: "intraday", tradesPerWeek: 3, requiresWeekendHolding: false,
  preferredDrawdown: "static", maxBudget: 100, budgetCurrency: "USD", minimumAccountSize: 0, avoidsConsistencyRules: true,
  tradesNews: false, usesAutomation: false,
  marketsTraded: "", riskPerTradePct: null,
};
const account: FirmAccount = {
  id: "test-account", firmName: "Example Firm", programmeName: "Example Evaluation",
  accountSize: 10000, accountSizeEvidence: { value: 10000, status: "verified" }, priceCurrency: "USD",
  evaluationPhases: { value: 1, status: "verified" }, profitTargetsPct: { value: [10], status: "verified" },
  dailyLossLimitPct: { value: 5, status: "verified" }, overallLossLimitPct: { value: 10, status: "verified" },
  lossCalculation: { value: "", status: "verified" }, dailyReset: { value: "", status: "verified" },
  minimumTradingDays: { value: "", status: "verified" }, timeLimit: { value: "", status: "verified" },
  price: { value: 50, status: "verified" },
  newsRule: { value: "", status: "verified" }, newsExecution: { value: "allowed", status: "verified" }, automationRule: { value: "allowed", status: "verified" },
  drawdownType: { value: "static", status: "verified" },
  weekendRule: { value: "", status: "verified" }, consistencyDetails: { value: "", status: "verified" },
  weekendHolding: { value: "allowed", status: "verified" },
  consistencyRule: { value: "absent", status: "verified" },
  supportedStyles: { value: ["intraday", "swing"], status: "verified" },
  payoutTerms: { value: "", status: "verified" }, profitSplit: { value: "", status: "verified" }, feeTerms: { value: "", status: "verified" }, otherRestrictions: { value: "", status: "verified" },
};

describe("PropFirm Intelligence matching engine", () => {
  it("estimates the compounding exposure of a same-day losing streak without inventing missing risk", () => {
    expect(estimateSequentialLossExposure(1, 3)).toBeCloseTo(2.9701);
    expect(estimateSequentialLossExposure(null, 3)).toBeNull();
  });
  it("withholds a purchase recommendation when a profile-relevant rule is unknown", () => {
    const profile = { ...trader, avoidsConsistencyRules: true, budgetCurrency: "USD" as const };
    const assessment = assessAccount(profile, firmAccounts.find((item) => item.id === "fundednext-stellar-2-step-6k")!, null);
    expect(assessment.decisionReady).toBe(false);
    expect(assessment.missingDecisionEvidence).toContain("consistency rule status");
    expect(decidePrimaryRecommendation([assessment]).isPurchaseRecommendation).toBe(false);
    expect(assessment.scoreCoveragePct).toBe(85);
  });
  it("uses the disclosed 100-point scoring weights", () => {
    expect(Object.values(MATCH_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });
  it("accepts a tested custom weight configuration", () => {
    const weights = { ...MATCH_WEIGHTS, drawdownFit: 50, tradingStyle: 20, holdingAndSession: 10, payoutAndConsistency: 10, costAndPreferences: 10 };
    expect(Object.values(weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    expect(scoreAccount(trader, account, weights).score).toBe(100);
  });
  it("offers several firms and never treats missing price as verified", () => {
    expect(new Set(firmAccounts.map((item) => item.firmName)).size).toBeGreaterThan(1);
    expect(firmAccounts.filter((item) => item.price.value === null).every((item) => item.price.status === "unverified")).toBe(true);
    expect(firmAccounts.filter((item) => item.price.status === "verified").every((item) => Boolean(item.price.sourceUrl && item.price.verifiedAt))).toBe(true);
  });
  it("keeps catalogue identifiers and displayed account sizes consistent", () => {
    expect(firmAccounts.find((item) => item.firmName === "The5ers")?.id).toBe("the5ers-high-stakes-2500");
    expect(firmAccounts.find((item) => item.id === "the5ers-high-stakes-2500")?.accountSize).toBe(2500);
  });
  it("offers many sourced sizes and distinct programme types, including larger accounts", () => {
    expect(firmAccounts.length).toBeGreaterThanOrEqual(25);
    expect(new Set(firmAccounts.map((item) => item.id)).size).toBe(firmAccounts.length);
    expect(new Set(firmAccounts.map((item) => item.firmName)).size).toBeGreaterThanOrEqual(4);
    expect(firmAccounts.some((item) => item.firmName === "FTMO" && item.programmeName.includes("2-Step"))).toBe(true);
    expect(firmAccounts.some((item) => item.accountSize >= 200_000)).toBe(true);
    expect(firmAccounts.every((item) => item.accountSizeEvidence.value === item.accountSize && item.accountSizeEvidence.status === "verified")).toBe(true);
  });
  it("records an official source and current verification date for every verified rule", () => {
    for (const firmAccount of firmAccounts) {
      for (const rule of Object.values(firmAccount)) {
        if (rule && typeof rule === "object" && "status" in rule && rule.status === "verified") {
          expect(rule).toMatchObject({ sourceUrl: expect.stringMatching(/^https:\/\//), verifiedAt: "2026-10-29" });
        }
      }
    }
  });
  it("accepts a compatible account", () => {
    expect(checkEligibility(trader, account).eligible).toBe(true);
  });
  it("rejects a verified account fee over budget", () => {
    expect(checkEligibility(trader, { ...account, price: { value: 150, status: "verified" } }).eligible).toBe(false);
  });
  it("excludes account sizes below the trader's declared minimum", () => {
    expect(checkEligibility({ ...trader, minimumAccountSize: 25000 }, account).eligible).toBe(false);
    expect(checkEligibility({ ...trader, minimumAccountSize: 10000 }, account).eligible).toBe(true);
  });
  it("does not reject an account on an unverified fee", () => {
    const result = checkEligibility(trader, { ...account, price: { value: null, status: "unverified" } });
    expect(result.eligible).toBe(true);
    expect(result.warnings).toContain("Account fee is unverified; budget fit cannot be assessed.");
  });
  it("does not compare prices across currencies", () => {
    const result = checkEligibility(trader, { ...account, priceCurrency: "EUR" });
    expect(result.eligible).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("EUR"))).toBe(true);
    expect(scoreAccount(trader, { ...account, priceCurrency: "EUR" }).reasons).not.toContain("Verified account fee fits your budget.");
  });
  it("rejects a known drawdown mismatch", () => {
    expect(checkEligibility(trader, { ...account, drawdownType: { value: "trailing", status: "verified" } }).eligible).toBe(false);
  });
  it("warns when a critical rule is unverified", () => {
    const result = scoreAccount(trader, { ...account, drawdownType: { value: "unknown", status: "unverified" } });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.score).not.toBeNull();
  });
  it("does not score a known-incompatible account", () => {
    expect(scoreAccount(trader, { ...account, price: { value: 150, status: "verified" } }).score).toBeNull();
  });
});
