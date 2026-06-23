import { describe, expect, it } from 'vitest';

import {
  getEffectiveRetirementPortfolio,
  presentValueOfRetirementWithdrawals,
  retirementFundingYears,
  retirementRothBalanceShare,
  rothToGrossEquivalent,
} from '@/utils/retirement-planning';

import { fixturePartnerFundingHorizon } from '@/src/core/retirement/fixtures';
import { realReturnPercent } from '@/src/core/shared/projection';

describe('retirementFundingYears', () => {
  it('uses the longer of self or partner retirement spans', () => {
    const inputs = fixturePartnerFundingHorizon();
    expect(retirementFundingYears(inputs, { planningMode: 'partner' })).toBe(28);
  });

  it('returns at least 1 year', () => {
    expect(
      retirementFundingYears(
        fixturePartnerFundingHorizon({
          lifeExpectancy: 66,
          retirementAge: 65,
          partnerLifeExpectancy: 66,
          partnerRetirementAge: 65,
        })
      )
    ).toBe(1);
  });
});

describe('presentValueOfRetirementWithdrawals', () => {
  it('returns 0 for non-positive withdrawal', () => {
    expect(presentValueOfRetirementWithdrawals(0, 30, 7.5, 2.5)).toBe(0);
  });

  it('uses level real-rate annuity factor', () => {
    const withdrawal = 50_000;
    const years = 30;
    const real = realReturnPercent(7.5, 2.5) / 100;
    const expected = (withdrawal * (1 - Math.pow(1 + real, -years))) / real;
    expect(presentValueOfRetirementWithdrawals(withdrawal, years, 7.5, 2.5)).toBeCloseTo(
      expected,
      5
    );
  });

  it('falls back to withdrawal × years when real rate is ~0', () => {
    expect(presentValueOfRetirementWithdrawals(40_000, 25, 2.5, 2.5)).toBe(1_000_000);
  });
});

describe('Roth gross-equivalent helpers', () => {
  it('computes Roth share of balances', () => {
    expect(retirementRothBalanceShare(100_000, 50_000)).toBeCloseTo(1 / 3, 5);
    expect(retirementRothBalanceShare(0, 0)).toBe(0);
  });

  it('grosses up Roth at a 20% withdrawal tax rate', () => {
    expect(rothToGrossEquivalent(80_000, 20)).toBe(100_000);
  });

  it('effective portfolio uses nominal pre-tax + Roth balances for total', () => {
    const portfolio = getEffectiveRetirementPortfolio(100_000, 50_000, 20);
    expect(portfolio.rothGrossEquivalent).toBe(62_500);
    expect(portfolio.totalEffective).toBe(150_000);
    expect(portfolio.nominalTotal).toBe(150_000);
  });
});
