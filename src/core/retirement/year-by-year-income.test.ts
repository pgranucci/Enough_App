import { describe, expect, it } from 'vitest';

import { calculateRetirementPlan } from '@/utils/retirement-planning';

import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';
import {
  annualHouseholdOtherIncomeAtAges,
  buildRetirementYearSchedule,
  presentValueOfScheduledGrossWithdrawals,
} from '@/src/core/retirement/year-by-year-income';
import { realReturnPercent } from '@/src/core/shared/projection';

describe('buildRetirementYearSchedule', () => {
  const profile = makeProfile({ dateOfBirth: '', userAge: 50 });
  const retirement = makeRetirement({
    currentAge: 50,
    retirementAge: 55,
    lifeExpectancy: 90,
    desiredAnnualGrossIncome: 60_000,
    socialSecurityEstimate: 24_000,
    socialSecurityClaimAge: 62,
    pensionEstimate: 0,
    partTimeRetirementIncome: 0,
    otherIncomeStreams: [
      {
        id: 'pt',
        name: 'Part-time',
        monthlyGross: 2_000,
        startAge: 65,
        endAge: 70,
        assignedTo: 'self',
        isWorkInRetirement: false,
      },
    ],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'single',
  });

  it('defers Social Security until claim age and applies part-time only between 65–70', () => {
    const schedule = buildRetirementYearSchedule(retirement, profile);

    const at55 = schedule.rows.find((r) => r.age === 55)!;
    const at61 = schedule.rows.find((r) => r.age === 61)!;
    const at62 = schedule.rows.find((r) => r.age === 62)!;
    const at64 = schedule.rows.find((r) => r.age === 64)!;
    const at65 = schedule.rows.find((r) => r.age === 65)!;
    const at70 = schedule.rows.find((r) => r.age === 70)!;
    const at71 = schedule.rows.find((r) => r.age === 71)!;

    expect(at55.socialSecurityNet).toBe(0);
    expect(at61.socialSecurityNet).toBe(0);
    expect(at62.socialSecurityNet).toBeGreaterThan(0);
    expect(at64.otherIncomeNet).toBe(0);
    expect(at65.otherIncomeNet).toBeGreaterThan(0);
    expect(at70.otherIncomeNet).toBeGreaterThan(0);
    expect(at71.otherIncomeNet).toBe(0);

    expect(at55.netPortfolioNeed).toBeGreaterThan(at62.netPortfolioNeed);
    expect(at65.netPortfolioNeed).toBeLessThan(at62.netPortfolioNeed);
  });

  it('required portfolio equals PV of each year’s scheduled gross withdrawal', () => {
    const schedule = buildRetirementYearSchedule(retirement, profile);
    const real = realReturnPercent(7.5, 2.5) / 100;
    const withdrawals = schedule.rows.map((r) => r.grossPortfolioWithdrawal);
    const pv = presentValueOfScheduledGrossWithdrawals(withdrawals, real);
    expect(Math.abs(schedule.requiredPortfolioTarget - pv)).toBeLessThan(0.01);
  });

  it('requires more portfolio than assuming SS from retirement age 55', () => {
    const withDeferredSs = buildRetirementYearSchedule(retirement, profile).requiredPortfolioTarget;

    const flatSs = buildRetirementYearSchedule(
      { ...retirement, socialSecurityClaimAge: 55 },
      profile
    ).requiredPortfolioTarget;

    expect(withDeferredSs).toBeGreaterThan(flatSs);
  });

  it('treats excluded Social Security as zero in all years', () => {
    const excluded = buildRetirementYearSchedule(
      {
        ...retirement,
        socialSecurityMode: 'excluded',
        socialSecurityEstimate: 24_000,
      },
      profile
    );
    for (const row of excluded.rows) {
      expect(row.socialSecurityNet).toBe(0);
    }

    const withSs = buildRetirementYearSchedule(retirement, profile);
    expect(excluded.requiredPortfolioTarget).toBeGreaterThan(
      withSs.requiredPortfolioTarget
    );
  });

  it('calculateRetirementPlan uses first retirement year gap and year-by-year PV', () => {
    const plan = calculateRetirementPlan(retirement, profile);
    const schedule = buildRetirementYearSchedule(retirement, profile);

    expect(plan.retirementIncomeGap).toBe(Math.round(schedule.firstYearNetGap));
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));
    expect(plan.retirementIncomeGap).toBeGreaterThan(0);
    expect(annualHouseholdOtherIncomeAtAges(retirement.otherIncomeStreams, 55, 0)).toBe(0);
    expect(annualHouseholdOtherIncomeAtAges(retirement.otherIncomeStreams, 65, 0)).toBe(24_000);
  });
});
