import { describe, expect, it } from 'vitest';

import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

describe('work in retirement FICA in year-by-year schedule', () => {
  const profile = makeProfile({ dateOfBirth: '', userAge: 50 });

  const base = makeRetirement({
    currentAge: 50,
    retirementAge: 55,
    lifeExpectancy: 90,
    desiredAnnualGrossIncome: 60_000,
    socialSecurityEstimate: 0,
    socialSecurityMode: 'excluded',
    pensionEstimate: 0,
    otherIncomeStreams: [],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'single',
  });

  it('increases required portfolio when part-time income is marked as work', () => {
    const rentalOnly = buildRetirementYearSchedule(
      {
        ...base,
        otherIncomeStreams: [
          {
            id: 'rental',
            name: 'Rental',
            monthlyGross: 2_000,
            startAge: 55,
            endAge: 90,
            assignedTo: 'self',
            isWorkInRetirement: false,
          },
        ],
      },
      profile
    );

    const partTimeWork = buildRetirementYearSchedule(
      {
        ...base,
        otherIncomeStreams: [
          {
            id: 'pt',
            name: 'Consulting',
            monthlyGross: 2_000,
            startAge: 55,
            endAge: 90,
            assignedTo: 'self',
            isWorkInRetirement: true,
          },
        ],
      },
      profile
    );

    expect(partTimeWork.requiredPortfolioTarget).toBeGreaterThan(
      rentalOnly.requiredPortfolioTarget
    );

    const at55Work = partTimeWork.rows.find((r) => r.age === 55)!;
    const at55Rental = rentalOnly.rows.find((r) => r.age === 55)!;
    expect(at55Work.netPortfolioNeed).toBeGreaterThan(at55Rental.netPortfolioNeed);
  });

  it('applies FICA to continuing partner employment automatically', () => {
    const partnerProfile = makeProfile({
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

    const schedule = buildRetirementYearSchedule(retirement, partnerProfile);
    const first = schedule.rows[0]!;
    expect(first.continuingEmploymentNet).toBeGreaterThan(0);
    expect(first.netPortfolioNeed).toBeGreaterThan(0);
    expect(first.continuingEmploymentNet).toBeLessThan(first.desiredNetIncome);
  });
});
