/**
 * Copy these patterns to reproduce app numbers in Vitest without Expo.
 *
 * Run all:  npm test
 * Run one:  npx vitest run src/core/buckets/completion-scenarios.test.ts
 * Watch:    npx vitest src/core/buckets/completion-scenarios.test.ts
 * One case: npx vitest run -t "May 2050"
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';

import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import { monthsUntilBalanceReachesTarget, realReturnPercent } from '@/src/core/shared/projection';

function emergencyBucket(target: number): BucketItem {
  return {
    id: 'emergency',
    name: 'Emergency',
    accent: '#000',
    target,
    current: 0,
    projectedFutureValue: 0,
    projectedFutureValueReal: 0,
    monthlyContribution: 0,
    estimatedCompletionDate: null,
    annualGrowthRate: 0,
    annualInflationRate: 2.5,
    yearsUntilTarget: 0,
  };
}

describe('completion scenarios (repro)', () => {
  const profile = DEFAULT_PROFILE_INPUTS;
  const retirement = {
    ...DEFAULT_RETIREMENT_INPUTS,
    inflationAssumption: 2.5,
    investmentGrowthMode: 'balanced' as const,
  };

  /** Completion date uses `new Date()` — freeze time to match "today is May 2026". */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('May 2050: $10k brokerage balanced, $0 savings, ~$30k emergency target', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-1',
      currentValue: 10_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 0,
    };

    const result = applyAssignedAccountsToBucket(
      emergencyBucket(30_000),
      [account],
      retirement,
      profile
    );

    const realGrowth = realReturnPercent(7.5, 2.5) / 100;
    const months = monthsUntilBalanceReachesTarget(30_000, 10_000, 0, realGrowth);

    expect(result.current).toBe(10_000);
    expect(result.monthlyContribution).toBe(0);
    expect(months).toBe(288);
    expect(result.yearsUntilTarget * 12).toBeCloseTo(288, 0);
    expect(result.estimatedCompletionDate).toMatch(/^2050-05/);
  });
});
