/**
 * Brokerage assigned to retirement bucket + Freedom vs bucket projection divergence.
 *
 *   npx vitest run src/core/retirement/retirement-brokerage-divergence.test.ts
 */
import { describe, expect, it } from 'vitest';

import { buildRetirementBucket } from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import { syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';
import { FIXTURE_SALARY_PROFILE, makeRetirement } from '@/src/core/retirement/fixtures';

const profile = FIXTURE_SALARY_PROFILE;

const brokerageAccount = {
  ...createEmptyFinancialAccount('brokerage'),
  id: 'brk-golden',
  name: 'Taxable brokerage',
  currentValue: 120_000,
  investmentMix: 'aggressive' as const,
  estimatedAnnualSavings: 12_000,
};

function retirementWithBrokerage() {
  const synced = syncRetirementFromBucketAccounts([brokerageAccount], profile);
  return makeRetirement({
    currentAge: 40,
    retirementAge: 65,
    desiredAnnualGrossIncome: 60_000,
    socialSecurityMode: 'excluded',
    socialSecurityEstimate: 0,
    pensionEstimate: 0,
    otherIncomeStreams: [],
    ...synced,
    accounts: [brokerageAccount],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'single',
    lifeExpectancy: 90,
  });
}

/** Locked: brokerage counts as pre-tax balance; Freedom uses aggregate 7.5% real path. */
const FREEDOM_PLAN = {
  requiredPortfolioTarget: 916_074,
  projectedReadinessPercent: 100,
  futureGrossEquivalentPortfolio: 985_388,
} as const;

/** Per-account aggressive mix projection exceeds Freedom aggregate path. */
const BUCKET_PROJECTION = {
  projectedGrossEquivalent: 1_553_865,
  bucketReadinessPercent: 100,
} as const;

describe('brokerage → retirement bucket', () => {
  it('syncs brokerage balance into traditional (pre-tax) total', () => {
    const retirement = retirementWithBrokerage();
    expect(retirement.traditionalBalance).toBe(120_000);
    expect(retirement.rothBalance).toBe(0);
    expect(retirement.monthlyContributions).toBe(1_000);
  });

  it('Freedom plan matches locked fixture', () => {
    const plan = calculateRetirementPlan(retirementWithBrokerage(), profile);
    expect(plan).toMatchObject(FREEDOM_PLAN);
  });

  it('bucket per-account projection diverges from Freedom aggregate readiness', () => {
    const retirement = retirementWithBrokerage();
    const plan = calculateRetirementPlan(retirement, profile);
    const projection = projectGrossEquivalentPortfolioAtRetirement(
      [brokerageAccount],
      retirement,
      profile,
      plan.effectiveRetirementTaxRatePercentAtRetirement
    );
    const bucket = buildRetirementBucket(retirement, profile);
    expect(bucket.readinessProgress).toBeDefined();

    expect(projection.projectedGrossEquivalent).toBe(BUCKET_PROJECTION.projectedGrossEquivalent);
    const bucketReadinessPercent = Math.round((bucket.readinessProgress ?? 0) * 100);
    expect(bucketReadinessPercent).toBe(
      BUCKET_PROJECTION.bucketReadinessPercent
    );
    expect(projection.projectedGrossEquivalent).toBeGreaterThan(
      plan.futureGrossEquivalentPortfolio
    );
    expect(bucketReadinessPercent).toBeGreaterThanOrEqual(
      plan.projectedReadinessPercent
    );
  });
});

describe('CA retirement tax location — golden required PV', () => {
  it('higher tax state increases required portfolio vs TX at same lifestyle', () => {
    const tx = makeRetirement({
      currentAge: 40,
      retirementAge: 65,
      desiredAnnualGrossIncome: 80_000,
      socialSecurityMode: 'excluded',
      traditionalBalance: 100_000,
      rothBalance: 50_000,
      monthlyContributions: 1_000,
      retirementStateOfResidence: 'TX',
      retirementFilingStatus: 'single',
      expectedAnnualReturn: 7.5,
      inflationAssumption: 2.5,
      lifeExpectancy: 95,
    });
    const ca = {
      ...tx,
      retirementStateOfResidence: 'CA' as const,
      retirementFilingStatus: 'married_joint' as const,
    };

    const txPlan = calculateRetirementPlan(tx, profile);
    const caPlan = calculateRetirementPlan(ca, profile);

    expect(caPlan.requiredPortfolioTarget).toBe(1_253_498);
    expect(caPlan.projectedReadinessPercent).toBe(89);
    expect(caPlan.requiredPortfolioTarget).toBeGreaterThan(txPlan.requiredPortfolioTarget);
  });
});
