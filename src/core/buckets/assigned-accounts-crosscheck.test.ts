/**
 * Assigned-account completion cross-check — run all or one:
 *   npx vitest run src/core/buckets/assigned-accounts-crosscheck.test.ts
 *   npx vitest run -t "scenario 1"
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';

import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import {
  monthsUntilBalanceReachesTarget,
  realReturnPercent,
} from '@/src/core/shared/projection';

/** Frozen "today" for completion dates (May 15, 2026). */
const AS_OF = new Date('2026-05-15T12:00:00Z');

const retirement = {
  ...DEFAULT_RETIREMENT_INPUTS,
  inflationAssumption: 2.5,
  investmentGrowthMode: 'balanced' as const,
};

const profileSolo = DEFAULT_PROFILE_INPUTS;
const realBalanced = realReturnPercent(7.5, 2.5) / 100;
const realConservative = realReturnPercent(5, 2.5) / 100;
const realAggressive = realReturnPercent(10, 2.5) / 100;

const profilePartner: typeof DEFAULT_PROFILE_INPUTS = {
  ...DEFAULT_PROFILE_INPUTS,
  planningMode: 'partner',
  partnerName: 'Alex',
  annualIncome: 95_000,
  partnerAnnualIncome: 72_000,
  partnerAge: 34,
};

function cashReserveBucket(
  id: 'emergency' | 'slush',
  target: number
): BucketItem {
  return {
    id,
    name: id,
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

function expectCompletion(
  result: ReturnType<typeof applyAssignedAccountsToBucket>,
  target: number,
  current: number,
  monthly: number,
  growth: number,
  expectedMonths: number,
  completionPrefix: string
) {
  expect(result.current).toBe(current);
  expect(result.monthlyContribution).toBe(monthly);
  const months =
    monthsUntilBalanceReachesTarget(target, current, monthly, growth) ?? null;
  expect(months).toBe(expectedMonths);
  expect(result.yearsUntilTarget * 12).toBeCloseTo(expectedMonths, 0);
  expect(result.estimatedCompletionDate).toMatch(new RegExp(`^${completionPrefix}`));
}

describe('assigned-account completion cross-check', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scenario 1 — emergency ← brokerage (balanced), $0 savings, growth only', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-emergency',
      currentValue: 10_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 0,
    };

    const result = applyAssignedAccountsToBucket(
      cashReserveBucket('emergency', 30_000),
      [account],
      retirement,
      profileSolo
    );

    expect(result.annualGrowthRate).toBe(7.5);
    expectCompletion(result, 30_000, 10_000, 0, realBalanced, 288, '2050-05');
  });

  it('scenario 2 — slush ← brokerage (balanced), with $3,600/yr savings', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-slush',
      currentValue: 8_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 3_600,
    };

    const result = applyAssignedAccountsToBucket(
      cashReserveBucket('slush', 18_000),
      [account],
      retirement,
      profileSolo
    );

    expect(result.annualGrowthRate).toBe(7.5);
    expectCompletion(result, 18_000, 8_000, 300, realBalanced, 29, '2028-10');
  });

  it('scenario 3 — emergency ← brokerage (conservative), $0 savings, growth only', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-conservative',
      currentValue: 12_000,
      investmentMix: 'conservative',
      estimatedAnnualSavings: 0,
    };

    const result = applyAssignedAccountsToBucket(
      cashReserveBucket('emergency', 27_000),
      [account],
      retirement,
      profileSolo
    );

    expect(result.annualGrowthRate).toBe(5);
    expectCompletion(result, 27_000, 12_000, 0, realConservative, 408, '2060-05');
  });

  it('scenario 4 — partner household, emergency ← two brokerages (mixed)', () => {
    const selfBrokerage: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-self',
      accountOwner: 'self',
      currentValue: 15_000,
      investmentMix: 'aggressive',
      estimatedAnnualSavings: 4_800,
    };
    const partnerBrokerage: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-partner',
      accountOwner: 'partner',
      currentValue: 6_000,
      investmentMix: 'conservative',
      estimatedAnnualSavings: 1_200,
    };

    const result = applyAssignedAccountsToBucket(
      cashReserveBucket('emergency', 37_500),
      [selfBrokerage, partnerBrokerage],
      retirement,
      profilePartner
    );

    const current = 21_000;
    const monthly = 500;
    const weightedReal =
      (15_000 * realAggressive + 6_000 * realConservative) / current;
    const weightedNominal = (15_000 * 10 + 6_000 * 5) / current;

    expect(result.current).toBe(current);
    expect(result.monthlyContribution).toBe(monthly);
    expect(result.annualGrowthRate).toBeCloseTo(weightedNominal, 5);
    expect(weightedReal).toBeCloseTo(0.05923, 3);

    expectCompletion(result, 37_500, current, monthly, weightedReal, 26, '2028-07');
  });
});
