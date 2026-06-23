import { describe, expect, it } from 'vitest';

import { getPartnerAnnualIncome } from '@/constants/profile';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { annualContinuingEmploymentGrossAtAges } from '@/src/core/retirement/continuing-employment-income';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

describe('annualContinuingEmploymentGrossAtAges', () => {
  const profile = makeProfile({
    planningMode: 'partner',
    dateOfBirth: '',
    partnerDateOfBirth: '',
    userAge: 40,
    partnerAge: 38,
    annualIncome: 120_000,
    partnerBaseAnnualSalary: 85_000,
    partnerAnnualIncome: 85_000,
  });

  const retirement = makeRetirement({
    currentAge: 40,
    retirementAge: 62,
    partnerRetirementAge: 65,
  });

  it('includes partner salary while partner is below their retirement age', () => {
    expect(getPartnerAnnualIncome(profile)).toBe(85_000);
    expect(
      annualContinuingEmploymentGrossAtAges(profile, retirement, 62, 60)
    ).toBe(85_000);
  });

  it('excludes partner salary once partner reaches their retirement age', () => {
    expect(
      annualContinuingEmploymentGrossAtAges(profile, retirement, 65, 65)
    ).toBe(0);
  });

  it('returns zero in solo mode', () => {
    expect(
      annualContinuingEmploymentGrossAtAges(
        makeProfile({ planningMode: 'solo' }),
        retirement,
        62,
        60
      )
    ).toBe(0);
  });
});

describe('staggered partner employment in year-by-year schedule', () => {
  const profile = makeProfile({
    planningMode: 'partner',
    dateOfBirth: '',
    partnerDateOfBirth: '',
    userAge: 40,
    partnerAge: 38,
    annualIncome: 120_000,
    partnerBaseAnnualSalary: 85_000,
    partnerAnnualIncome: 85_000,
  });

  const retirement = makeRetirement({
    currentAge: 40,
    retirementAge: 62,
    partnerRetirementAge: 65,
    desiredAnnualGrossIncome: 153_750,
    socialSecurityMode: 'excluded',
    partnerSocialSecurityMode: 'excluded',
    pensionEstimate: 0,
    otherIncomeStreams: [],
    traditionalBalance: 355_000,
    rothBalance: 100_000,
    monthlyContributions: 0,
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'FL',
    retirementFilingStatus: 'married_joint',
    lifeExpectancy: 92,
    partnerLifeExpectancy: 94,
  });

  it('reduces portfolio need while partner is still working full time', () => {
    const schedule = buildRetirementYearSchedule(retirement, profile);
    const first = schedule.rows[0]!;

    expect(first.age).toBe(62);
    expect(first.partnerAge).toBe(60);
    expect(first.continuingEmploymentNet).toBeGreaterThan(0);
    expect(first.netPortfolioNeed).toBeLessThan(first.desiredNetIncome);

    const afterPartnerRetires = schedule.rows.find((row) => row.partnerAge >= 65);
    expect(afterPartnerRetires?.continuingEmploymentNet).toBe(0);
  });

  it('lowers required portfolio vs ignoring partner employment', () => {
    const withEmployment = calculateRetirementPlan(retirement, profile);
    const withoutPartnerIncome = calculateRetirementPlan(retirement, {
      ...profile,
      partnerBaseAnnualSalary: 0,
      partnerAnnualIncome: 0,
    });

    expect(withEmployment.inflatedContinuingEmployment).toBe(85_000);
    expect(withEmployment.requiredPortfolioTarget).toBeLessThan(
      withoutPartnerIncome.requiredPortfolioTarget
    );
    expect(withEmployment.requiredPortfolioTarget).toBe(2_091_283);
    expect(withoutPartnerIncome.requiredPortfolioTarget).toBe(2_427_209);
  });
});
