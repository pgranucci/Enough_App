import { describe, expect, it } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import {
  createEmptyFinancialAccount,
  type FinancialAccount,
} from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';

import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import {
  COMPLETION_SEARCH_MAX_MONTHS,
  monthsUntilBalanceReachesTarget,
  realReturnPercent,
} from '@/src/core/shared/projection';

function baseBucket(overrides: Partial<BucketItem>): BucketItem {
  return {
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
    annualInflationRate: 3,
    yearsUntilTarget: 0,
    ...overrides,
  };
}

function savingsAccount(overrides: Partial<FinancialAccount> = {}): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('savings'),
    id: 'sav-1',
    currentValue: 1_000,
    estimatedAnnualSavings: 1_000,
    investmentMix: 'cash',
    ...overrides,
  };
}

describe('applyAssignedAccountsToBucket', () => {
  const profile = DEFAULT_PROFILE_INPUTS;
  const retirement = {
    ...DEFAULT_RETIREMENT_INPUTS,
    inflationAssumption: 3,
    investmentGrowthMode: 'balanced' as const,
  };

  it('uses nominal (0%) growth for emergency cash so completion is reachable', () => {
    const account = savingsAccount();
    const result = applyAssignedAccountsToBucket(
      baseBucket({ id: 'emergency' }),
      [account],
      retirement,
      profile
    );

    expect(result.annualGrowthRate).toBe(0);
    expect(result.estimatedCompletionDate).not.toBeNull();
    expect(result.monthlyContribution).toBe(Math.round(1000 / 12));

    const monthly = 1000 / 12;
    const monthsNominal = monthsUntilBalanceReachesTarget(30_000, 1_000, monthly, 0);
    const monthsIfRealOnCash =
      monthsUntilBalanceReachesTarget(
        30_000,
        1_000,
        monthly,
        realReturnPercent(0, retirement.inflationAssumption) / 100
      ) ?? COMPLETION_SEARCH_MAX_MONTHS;

    expect(monthsNominal).not.toBeNull();
    expect(monthsNominal!).toBeGreaterThan(340);
    expect(monthsNominal!).toBeLessThan(360);
    expect(monthsIfRealOnCash).toBeGreaterThan(monthsNominal!);
    expect(result.yearsUntilTarget * 12).toBeCloseTo(monthsNominal!, 0);
  });

  it('uses real return for invested retirement assignments', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('retirement'),
      id: '401k-1',
      currentValue: 10_000,
      preTaxCurrentValue: 10_000,
      investmentMix: 'balanced',
      annualContributionDollars: 6_000,
    };

    const result = applyAssignedAccountsToBucket(
      baseBucket({
        id: 'retirement',
        target: 500_000,
        annualInflationRate: retirement.inflationAssumption,
      }),
      [account],
      retirement,
      profile
    );

    const nominalBalanced = 7.5;
    const expectedReal = realReturnPercent(nominalBalanced, retirement.inflationAssumption);
    expect(result.annualGrowthRate).toBe(nominalBalanced);
    expect(result.estimatedCompletionDate).not.toBeNull();

    const monthsAtReal =
      monthsUntilBalanceReachesTarget(
        500_000,
        10_000,
        500,
        expectedReal / 100
      ) ?? 0;
    expect(monthsAtReal).toBeGreaterThan(0);
  });

  it('returns null completion (UI shows —) when real return is too negative to reach target', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-1',
      currentValue: 1_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 1_000,
    };
    const hostileRetirement = {
      ...retirement,
      investmentGrowthMode: 'custom' as const,
      customInvestmentGrowthRates: {
        ...retirement.customInvestmentGrowthRates,
        balanced: 0,
      },
      inflationAssumption: 100,
    };

    const result = applyAssignedAccountsToBucket(
      baseBucket({ id: 'vacation', target: 30_000 }),
      [account],
      hostileRetirement,
      profile
    );

    expect(result.estimatedCompletionDate).toBeNull();
    expect(result.yearsUntilTarget).toBe(0);
    expect(result.monthlyContribution).toBeGreaterThan(0);

    const growth = realReturnPercent(0, hostileRetirement.inflationAssumption) / 100;
    expect(growth).toBeCloseTo(-0.5, 5);
    expect(
      monthsUntilBalanceReachesTarget(30_000, 1_000, 1000 / 12, growth)
    ).toBeNull();
  });

  it('returns null completion for cash emergency with no savings and no growth', () => {
    const result = applyAssignedAccountsToBucket(
      baseBucket({ id: 'emergency' }),
      [savingsAccount({ estimatedAnnualSavings: 0 })],
      retirement,
      profile
    );

    expect(result.monthlyContribution).toBe(0);
    expect(result.estimatedCompletionDate).toBeNull();
    expect(result.yearsUntilTarget).toBe(0);
  });

  it('estimates completion for emergency/slush from balance and real growth when savings are zero', () => {
    const account: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-emergency',
      currentValue: 10_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 0,
    };
    const realGrowth =
      realReturnPercent(7.5, retirement.inflationAssumption) / 100;

    for (const bucketId of ['emergency', 'slush'] as const) {
      const result = applyAssignedAccountsToBucket(
        baseBucket({ id: bucketId, target: 30_000 }),
        [account],
        retirement,
        profile
      );

      expect(result.monthlyContribution).toBe(0);
      expect(result.current).toBe(10_000);
      expect(result.estimatedCompletionDate).not.toBeNull();
      expect(
        monthsUntilBalanceReachesTarget(30_000, 10_000, 0, realGrowth)
      ).not.toBeNull();
    }
  });
});
