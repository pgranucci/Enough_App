/**
 * Completion when user overrides Profile → Assumptions (custom growth + inflation).
 *
 *   npx vitest run src/core/buckets/profile-assumptions-completion.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import {
  DEFAULT_CUSTOM_INVESTMENT_GROWTH_RATES,
  DEFAULT_RETIREMENT_INPUTS,
} from '@/constants/retirement';

import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import {
  monthsUntilBalanceReachesTarget,
  realReturnPercent,
} from '@/src/core/shared/projection';

const AS_OF = new Date('2026-05-15T12:00:00Z');

/** User-edited assumptions (not preset 7.5% / 2.5%). */
const USER_CUSTOM_RATES = {
  ...DEFAULT_CUSTOM_INVESTMENT_GROWTH_RATES,
  conservative: 4,
  balanced: 9,
  aggressive: 11,
};

const retirement = {
  ...DEFAULT_RETIREMENT_INPUTS,
  investmentGrowthMode: 'custom' as const,
  customInvestmentGrowthRates: USER_CUSTOM_RATES,
  inflationAssumption: 3.5,
  /** Retirement-only field; does NOT change emergency/slush assigned-account completion. */
  expectedAnnualReturn: 6,
};

describe('profile assumptions override → completion date', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses custom balanced return and custom inflation for assigned brokerage', () => {
    const nominalBalanced = USER_CUSTOM_RATES.balanced;
    const inflation = retirement.inflationAssumption;
    const realBalanced = realReturnPercent(nominalBalanced, inflation) / 100;

    expect(realBalanced).toBeCloseTo(0.05314, 4);

    const account = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-custom',
      currentValue: 12_000,
      investmentMix: 'balanced' as const,
      estimatedAnnualSavings: 2_400,
    };

    const bucket: BucketItem = {
      id: 'emergency',
      name: 'Emergency',
      accent: '#000',
      target: 30_000,
      current: 0,
      projectedFutureValue: 0,
      projectedFutureValueReal: 0,
      monthlyContribution: 0,
      estimatedCompletionDate: null,
      annualGrowthRate: 0,
      annualInflationRate: inflation,
      yearsUntilTarget: 0,
    };

    const result = applyAssignedAccountsToBucket(
      bucket,
      [account],
      retirement,
      DEFAULT_PROFILE_INPUTS
    );

    expect(result.current).toBe(12_000);
    expect(result.monthlyContribution).toBe(200);
    expect(result.annualGrowthRate).toBe(9);
    expect(result.annualInflationRate).toBe(3.5);

    const months =
      monthsUntilBalanceReachesTarget(30_000, 12_000, 200, realBalanced) ?? null;
    expect(months).toBe(63);
    expect(result.yearsUntilTarget * 12).toBeCloseTo(63, 0);
    expect(result.estimatedCompletionDate).toMatch(/^2031-08/);
  });
});
