import { describe, expect, it } from 'vitest';

import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';
import {
  grossAnnualWithdrawalForNetNeed,
  grossToNetRetirementIncome,
  householdNetIncomeAfterTax,
  preTaxWithdrawalTaxRatePercent,
  solvePortfolioGrossWithdrawalForHouseholdNetGoal,
} from '@/utils/retirement-income-tax';

const TX_SINGLE = {
  retirementStateOfResidence: 'TX' as const,
  retirementFilingStatus: 'single' as const,
};

describe('year-by-year household tax solver', () => {
  it('matches lifestyle-only year when no other income', () => {
    const desiredNet = grossToNetRetirementIncome(60_000, TX_SINGLE);
    const taxRate = preTaxWithdrawalTaxRatePercent(TX_SINGLE, 60_000);
    const legacy = grossAnnualWithdrawalForNetNeed(desiredNet, 0, taxRate);
    const solved = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      0,
      0,
      desiredNet,
      TX_SINGLE
    );

    expect(Math.round(solved)).toBeCloseTo(Math.round(legacy), -1);
    expect(
      householdNetIncomeAfterTax(0, solved, 0, TX_SINGLE)
    ).toBeCloseTo(desiredNet, -1);
  });

  it('lowers portfolio gross withdrawal when Social Security is in the tax base', () => {
    const desiredNet = grossToNetRetirementIncome(60_000, TX_SINGLE);
    const withoutSs = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      0,
      0,
      desiredNet,
      TX_SINGLE
    );
    const withSs = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      24_000,
      0,
      desiredNet,
      TX_SINGLE
    );

    expect(withSs).toBeLessThan(withoutSs);
    expect(
      householdNetIncomeAfterTax(24_000, withSs, 0, TX_SINGLE)
    ).toBeCloseTo(desiredNet, -1);
  });

  it('uses a lower effective tax rate when other income fills lower brackets', () => {
    const profile = makeProfile({ dateOfBirth: '', userAge: 50 });
    const retirement = makeRetirement({
      currentAge: 50,
      retirementAge: 55,
      lifeExpectancy: 90,
      desiredAnnualGrossIncome: 60_000,
      socialSecurityEstimate: 24_000,
      socialSecurityClaimAge: 62,
      pensionEstimate: 0,
      otherIncomeStreams: [],
      expectedAnnualReturn: 7.5,
      inflationAssumption: 2.5,
      retirementStateOfResidence: 'TX',
      retirementFilingStatus: 'single',
    });

    const schedule = buildRetirementYearSchedule(retirement, profile);
    const at55 = schedule.rows.find((r) => r.age === 55)!;
    const at62 = schedule.rows.find((r) => r.age === 62)!;

    expect(at62.grossPortfolioWithdrawal).toBeLessThan(at55.grossPortfolioWithdrawal);
    expect(
      householdNetIncomeAfterTax(24_000, at62.grossPortfolioWithdrawal, 0, retirement)
    ).toBeCloseTo(at55.desiredNetIncome, 0);
  });

  it('varies gross withdrawal by year with part-time income', () => {
    const profile = makeProfile({ dateOfBirth: '', userAge: 50 });
    const retirement = makeRetirement({
      currentAge: 50,
      retirementAge: 55,
      lifeExpectancy: 90,
      desiredAnnualGrossIncome: 60_000,
      socialSecurityEstimate: 24_000,
      socialSecurityClaimAge: 62,
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

    const schedule = buildRetirementYearSchedule(retirement, profile);
    const at64 = schedule.rows.find((r) => r.age === 64)!;
    const at65 = schedule.rows.find((r) => r.age === 65)!;
    const at71 = schedule.rows.find((r) => r.age === 71)!;

    expect(at65.grossPortfolioWithdrawal).toBeLessThan(at64.grossPortfolioWithdrawal);
    expect(at71.grossPortfolioWithdrawal).toBeGreaterThan(at65.grossPortfolioWithdrawal);
  });
});
