/**
 * Year-by-year schedule uses Roth-aware gross-up with per-year tax recomputation.
 *
 *   npx vitest run src/core/retirement/retirement-schedule-roth-grossup.test.ts
 */
import { describe, expect, it } from 'vitest';

import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import {
  grossToNetRetirementIncome,
  householdNetIncomeAfterTax,
  solvePortfolioGrossWithdrawalForHouseholdNetGoal,
} from '@/utils/retirement-income-tax';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

const profileAt55 = makeProfile({ dateOfBirth: '', userAge: 55 });

const RETIRE_AT_55_MIX = makeRetirement({
  currentAge: 55,
  retirementAge: 55,
  lifeExpectancy: 90,
  desiredAnnualGrossIncome: 60_000,
  socialSecurityEstimate: 24_000,
  socialSecurityClaimAge: 62,
  pensionEstimate: 0,
  otherIncomeStreams: [],
  traditionalBalance: 100_000,
  rothBalance: 50_000,
  monthlyContributions: 0,
  expectedAnnualReturn: 7.5,
  inflationAssumption: 2.5,
  retirementStateOfResidence: 'TX',
  retirementFilingStatus: 'single',
});

describe('year-by-year schedule uses Roth-aware gross-up', () => {
  it('first-year gross withdrawal uses Roth share and yearly tax solver', () => {
    const schedule = buildRetirementYearSchedule(RETIRE_AT_55_MIX, profileAt55);
    const first = schedule.rows[0];
    const rothShare = 50_000 / 150_000;
    const desiredNet = grossToNetRetirementIncome(60_000, RETIRE_AT_55_MIX);

    expect(first.netPortfolioNeed).toBe(54_839);
    expect(Math.round(first.grossPortfolioWithdrawal)).toBe(
      Math.round(
        solvePortfolioGrossWithdrawalForHouseholdNetGoal(
          0,
          rothShare,
          desiredNet,
          RETIRE_AT_55_MIX
        )
      )
    );
    expect(Math.round(first.grossPortfolioWithdrawal)).toBe(57_393);
    expect(
      householdNetIncomeAfterTax(0, first.grossPortfolioWithdrawal, rothShare, RETIRE_AT_55_MIX)
    ).toBeCloseTo(desiredNet, -1);
  });

  it('100% pre-tax yields higher required PV than 100% Roth', () => {
    const preTaxOnly = buildRetirementYearSchedule(
      { ...RETIRE_AT_55_MIX, traditionalBalance: 682_352, rothBalance: 0 },
      profileAt55
    );
    const rothOnly = buildRetirementYearSchedule(
      { ...RETIRE_AT_55_MIX, traditionalBalance: 0, rothBalance: 682_352 },
      profileAt55
    );

    expect(Math.round(preTaxOnly.requiredPortfolioTarget)).toBe(780_946);
    expect(Math.round(rothOnly.requiredPortfolioTarget)).toBe(700_343);
    expect(rothOnly.requiredPortfolioTarget).toBeLessThan(preTaxOnly.requiredPortfolioTarget);
  });

  it('required PV differs by balance mix for the same income schedule', () => {
    const half = buildRetirementYearSchedule(
      { ...RETIRE_AT_55_MIX, traditionalBalance: 341_176, rothBalance: 341_176 },
      profileAt55
    );
    expect(Math.round(half.requiredPortfolioTarget)).toBe(731_125);
  });
});
