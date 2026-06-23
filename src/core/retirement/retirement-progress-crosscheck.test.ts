/**
 * Retirement progress / readiness cross-check — run:
 *   npx vitest run src/core/retirement/retirement-progress-crosscheck.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';

import { buildRetirementBucket } from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import { syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';
import { accountContributionBreakdown } from '@/src/core/accounts/contributions';
import { simulateRetirement } from '@/src/core/retirement/engine';
import { realReturnPercent } from '@/src/core/shared/projection';

const AS_OF = new Date('2026-05-15T12:00:00Z');

import { FIXTURE_SALARY_PROFILE, makeRetirement } from '@/src/core/retirement/fixtures';

const profile = FIXTURE_SALARY_PROFILE;

const BASE_RETIREMENT = makeRetirement({
  currentAge: 40,
  retirementAge: 65,
  desiredAnnualGrossIncome: 60_000,
  socialSecurityEstimate: 0,
  pensionEstimate: 0,
  otherIncomeStreams: [],
  expectedAnnualReturn: 7.5,
  inflationAssumption: 2.5,
  retirementStateOfResidence: 'TX',
  retirementFilingStatus: 'single',
  lifeExpectancy: 90,
});

function readinessPercent(projected: number, required: number) {
  return required > 0 ? Math.min(100, Math.round((projected / required) * 100)) : 100;
}

describe('retirement progress cross-check', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scenario 1 — fixed balance, zero savings (Freedom + bucket)', () => {
    const retirement = {
      ...BASE_RETIREMENT,
      traditionalBalance: 250_000,
      rothBalance: 0,
      monthlyContributions: 0,
      accounts: [],
    };

    const plan = calculateRetirementPlan(retirement, profile);
    const bucket = buildRetirementBucket(retirement, profile);
    const real = realReturnPercent(7.5, 2.5) / 100;
    const fvManual = Math.round(
      simulateRetirement({
        currentAge: 40,
        retirementAge: 65,
        balanceToday: 250_000,
        monthlyContribution: 0,
        nominalAnnualReturnPercent: 7.5,
        inflationAssumptionPercent: 2.5,
      }).projectedBalanceAtRetirement
    );

    expect(plan.nominalPortfolioTotal).toBe(250_000);
    expect(plan.futureGrossEquivalentPortfolio).toBe(fvManual);
    expect(plan.projectedReadinessPercent).toBe(
      readinessPercent(plan.futureGrossEquivalentPortfolio, plan.requiredPortfolioTarget)
    );
    expect(bucket.readinessProgress).toBeCloseTo(
      plan.futureGrossEquivalentPortfolio / plan.requiredPortfolioTarget,
      3
    );
    expect(bucket.readinessProgress).toBeDefined();

    expect(bucket.estimatedCompletionDate).toBeNull();

    const lines = [
      '',
      '=== Scenario 1: fixed $250k pre-tax, $0 savings ===',
      `Frozen today: ${AS_OF.toISOString().slice(0, 10)}`,
      `Years to retirement: ${plan.yearsUntilRetirement}`,
      `Required portfolio: $${plan.requiredPortfolioTarget.toLocaleString()}`,
      `Projected at retirement (gross-equiv, REAL 4.878%): $${plan.futureGrossEquivalentPortfolio.toLocaleString()}`,
      `Freedom readiness: ${plan.projectedReadinessPercent}%`,
      `Bucket readinessProgress: ${((bucket.readinessProgress ?? 0) * 100).toFixed(1)}%`,
      'Retirement bucket: no estimated completion date',
      '',
    ];
    writeFileSync('retirement-progress-crosscheck-output.txt', lines.join('\n'), 'utf8');
  });

  it('scenario 2 — 401(k) + Roth IRA, mixed growth and contributions', () => {
    const account401k = {
      ...createEmptyFinancialAccount('retirement'),
      id: '401k',
      name: '401(k)',
      isEmployerPlan: true,
      preTaxCurrentValue: 120_000,
      rothCurrentValue: 30_000,
      currentValue: 150_000,
      investmentMix: 'balanced' as const,
      employeePreTaxContributionPercent: 8,
      employeeRothContributionPercent: 2,
      employerMatchPercent: 4,
      employerProfitSharingPercent: 2,
    };
    const rothIra = {
      ...createEmptyFinancialAccount('retirement'),
      id: 'roth-ira',
      name: 'Roth IRA',
      isEmployerPlan: false,
      isRoth: true,
      currentValue: 45_000,
      investmentMix: 'aggressive' as const,
      annualContributionDollars: 7_000,
    };

    const k401Breakdown = accountContributionBreakdown(account401k, profile);
    const iraBreakdown = accountContributionBreakdown(rothIra, profile);

    const synced = syncRetirementFromBucketAccounts([account401k, rothIra], profile);
    const retirement = {
      ...BASE_RETIREMENT,
      ...synced,
      accounts: [account401k, rothIra],
    };

    const plan = calculateRetirementPlan(retirement, profile);
    const projection = projectGrossEquivalentPortfolioAtRetirement(
      [account401k, rothIra],
      retirement,
      profile,
      plan.effectiveRetirementTaxRatePercentAtRetirement
    );
    const bucket = buildRetirementBucket(retirement, profile);

    expect(k401Breakdown.totalAnnual).toBe(15_200);
    expect(iraBreakdown.totalAnnual).toBe(7_000);
    expect(projection.monthlyContributionEmployee).toBeCloseTo(1_375, 1);
    expect(projection.monthlyContributionEmployer).toBeCloseTo(475, 1);
    expect(projection.monthlyContributionTotal).toBeCloseTo(1_850, 1);

    expect(bucket.readinessProgress).toBeDefined();
    const bucketReadiness = Math.round((bucket.readinessProgress ?? 0) * 100);
    expect(bucketReadiness).toBe(
      readinessPercent(projection.projectedGrossEquivalent, plan.requiredPortfolioTarget)
    );

    const lines = [
      '',
      '=== Scenario 2: 401(k) + Roth IRA ===',
      `401(k): $120k pre-tax + $30k Roth (balanced). Employee 8%+2%, employer 4%+2% on $95k → $${k401Breakdown.totalAnnual.toLocaleString()}/yr`,
      `Roth IRA: $45k (aggressive), $7,000/yr`,
      `Monthly: employee $${Math.round(projection.monthlyContributionEmployee)}/mo, employer $${Math.round(projection.monthlyContributionEmployer)}/mo`,
      `Weighted real return (balance-weighted): ${projection.weightedAnnualReturnPercent.toFixed(2)}%`,
      `Required portfolio: $${plan.requiredPortfolioTarget.toLocaleString()}`,
      `Projected gross-equivalent (account-level): $${projection.projectedGrossEquivalent.toLocaleString()}`,
      `Freedom readiness (aggregate 7.5% path): ${plan.projectedReadinessPercent}%`,
      `  projected $${plan.futureGrossEquivalentPortfolio.toLocaleString()} vs required $${plan.requiredPortfolioTarget.toLocaleString()}`,
      `Retirement bucket readiness (per-account mixes): ${bucketReadiness}%`,
      `  projected $${projection.projectedGrossEquivalent.toLocaleString()}`,
      '',
    ];
    const prev = readFileSync('retirement-progress-crosscheck-output.txt', 'utf8');
    writeFileSync('retirement-progress-crosscheck-output.txt', prev + lines.join('\n'), 'utf8');
  });
});
