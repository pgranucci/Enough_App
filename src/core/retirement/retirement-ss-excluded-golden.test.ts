/**
 * Social Security "Exclude" — locked required PV and readiness vs included SS.
 *
 *   npx vitest run src/core/retirement/retirement-ss-excluded-golden.test.ts
 */
import { describe, expect, it } from 'vitest';

import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { FIXTURE_SALARY_PROFILE, makeRetirement } from '@/src/core/retirement/fixtures';

const profile = FIXTURE_SALARY_PROFILE;

/** $250k pre-tax, $60k lifestyle, SS estimate $24k/yr at 67 — excluded from plan. */
const SS_EXCLUDED_RETIREMENT = makeRetirement({
  currentAge: 40,
  retirementAge: 65,
  desiredAnnualGrossIncome: 60_000,
  socialSecurityMode: 'excluded',
  socialSecurityEstimate: 24_000,
  socialSecurityClaimAge: 67,
  pensionEstimate: 0,
  otherIncomeStreams: [],
  traditionalBalance: 250_000,
  rothBalance: 0,
  monthlyContributions: 0,
  accounts: [],
  expectedAnnualReturn: 7.5,
  inflationAssumption: 2.5,
  retirementStateOfResidence: 'TX',
  retirementFilingStatus: 'single',
  lifeExpectancy: 90,
});

/** Locked when SS is excluded despite a stored estimate. */
const SS_EXCLUDED_PLAN = {
  requiredPortfolioTarget: 916_074,
  projectedReadinessPercent: 90,
  futureGrossEquivalentPortfolio: 822_347,
  retirementIncomeGap: 54_839,
  annualGrossWithdrawalFromPortfolio: 60_000,
} as const;

/** Same profile with SS included in the year-by-year schedule. */
const SS_INCLUDED_PLAN = {
  requiredPortfolioTarget: 596_523,
  projectedReadinessPercent: 100,
} as const;

describe('Social Security excluded — golden fixtures', () => {
  it('matches locked plan outputs when SS is excluded', () => {
    const plan = calculateRetirementPlan(SS_EXCLUDED_RETIREMENT, profile);
    expect(plan).toMatchObject(SS_EXCLUDED_PLAN);
  });

  it('required portfolio matches year-by-year schedule PV', () => {
    const schedule = buildRetirementYearSchedule(SS_EXCLUDED_RETIREMENT, profile);
    const plan = calculateRetirementPlan(SS_EXCLUDED_RETIREMENT, profile);
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));
    for (const row of schedule.rows) {
      expect(row.socialSecurityNet).toBe(0);
    }
  });

  it('including SS lowers required portfolio and raises readiness (same balance)', () => {
    const included = calculateRetirementPlan(
      { ...SS_EXCLUDED_RETIREMENT, socialSecurityMode: 'calculated' },
      profile
    );
    const excluded = calculateRetirementPlan(SS_EXCLUDED_RETIREMENT, profile);

    expect(included).toMatchObject(SS_INCLUDED_PLAN);
    expect(excluded.futureGrossEquivalentPortfolio).toBe(included.futureGrossEquivalentPortfolio);
    expect(excluded.requiredPortfolioTarget).toBeGreaterThan(included.requiredPortfolioTarget);
    expect(excluded.projectedReadinessPercent).toBeLessThan(included.projectedReadinessPercent);
  });
});
