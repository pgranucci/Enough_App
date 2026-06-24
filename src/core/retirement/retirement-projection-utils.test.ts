import { describe, expect, it } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import {
  calculateRetirementPaceMetrics,
  getWeightedRetirementRealReturnPercent,
} from '@/src/core/retirement/retirement-projection-utils';
import { realReturnPercent } from '@/src/core/shared/projection';

function retirementBucket(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id: 'retirement',
    name: 'Retirement',
    accent: '#3B6FD4',
    target: 1_000_000,
    current: 0,
    monthlyContribution: 0,
    projectedFutureValue: 750_000,
    projectedFutureValueReal: 750_000,
    estimatedCompletionDate: null,
    annualGrowthRate: 0,
    annualInflationRate: 2.5,
    yearsUntilTarget: 30,
    ...overrides,
  };
}

describe('retirement pace return assumptions', () => {
  it('uses balance-weighted real returns from assigned account investment mixes', () => {
    const conservative = {
      ...createEmptyFinancialAccount('retirement'),
      id: 'conservative-401k',
      currentValue: 100_000,
      investmentMix: 'conservative' as const,
    };
    const aggressive = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'aggressive-brokerage',
      currentValue: 300_000,
      investmentMix: 'aggressive' as const,
    };
    const retirement = {
      ...DEFAULT_RETIREMENT_INPUTS,
      currentAge: 40,
      retirementAge: 65,
      inflationAssumption: 2.5,
      accounts: [conservative, aggressive],
    };
    const profile = {
      ...DEFAULT_PROFILE_INPUTS,
      expenses: {
        ...DEFAULT_PROFILE_INPUTS.expenses,
        bucketAssignedAccountIds: {
          retirement: [conservative.id, aggressive.id],
        },
      },
    };

    const conservativeReal = realReturnPercent(5, retirement.inflationAssumption);
    const aggressiveReal = realReturnPercent(10, retirement.inflationAssumption);
    const expectedWeightedReal = (100_000 * conservativeReal + 300_000 * aggressiveReal) / 400_000;

    const pace = calculateRetirementPaceMetrics({
      retirementBucket: retirementBucket(),
      profile,
      retirement,
    });

    expect(pace.annualReturnPercentUsed).toBeCloseTo(expectedWeightedReal, 5);
  });

  it('uses contribution-weighted real returns when assigned accounts have no balances', () => {
    const conservative = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'future-conservative',
      currentValue: 0,
      estimatedAnnualSavings: 1_000,
      investmentMix: 'conservative' as const,
    };
    const aggressive = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'future-aggressive',
      currentValue: 0,
      estimatedAnnualSavings: 3_000,
      investmentMix: 'aggressive' as const,
    };
    const retirement = {
      ...DEFAULT_RETIREMENT_INPUTS,
      inflationAssumption: 2.5,
      accounts: [conservative, aggressive],
    };

    const conservativeReal = realReturnPercent(5, retirement.inflationAssumption);
    const aggressiveReal = realReturnPercent(10, retirement.inflationAssumption);
    const expectedWeightedReal = (1_000 * conservativeReal + 3_000 * aggressiveReal) / 4_000;

    expect(
      getWeightedRetirementRealReturnPercent(
        [conservative, aggressive],
        retirement,
        retirement.inflationAssumption,
        DEFAULT_PROFILE_INPUTS
      )
    ).toBeCloseTo(expectedWeightedReal, 5);
  });
});
