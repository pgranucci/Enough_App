import { describe, expect, it } from 'vitest';

import {
  estimateCompletionMonths,
  futureValueNominal,
  monthsUntilBalanceReachesTarget,
  realReturnPercent,
} from '@/src/core/shared/projection';

describe('futureValueNominal', () => {
  it('applies annual growth at year boundaries with beginning-of-month contributions', () => {
    const twelveMonths = futureValueNominal(1000, 100, 0.1, 12);
    expect(twelveMonths).toBeCloseTo(1000 + 12 * 100 + (1000 + 12 * 100) * 0.1, 5);
  });
});

describe('monthsUntilBalanceReachesTarget', () => {
  it('returns null when monthly contribution is zero and growth is not positive', () => {
    expect(monthsUntilBalanceReachesTarget(30_000, 1_000, 0, 0)).toBeNull();
  });

  it('reaches target with zero contributions when annual growth is positive', () => {
    const months = monthsUntilBalanceReachesTarget(30_000, 10_000, 0, 0.05);
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(0);
    expect(months!).toBeLessThan(600);
  });

  it('returns null when negative growth prevents reaching target within search horizon', () => {
    const monthly = 1000 / 12;
    expect(monthsUntilBalanceReachesTarget(30_000, 1_000, monthly, -0.5)).toBeNull();
  });

  it('reaches a $30k target in ~29 years with $1k balance and $1k/yr at 0% growth', () => {
    const monthly = 1000 / 12;
    const months = monthsUntilBalanceReachesTarget(30_000, 1_000, monthly, 0);
    expect(months).not.toBeNull();
    expect(months!).toBeGreaterThan(340);
    expect(months!).toBeLessThan(360);
  });
});

describe('estimateCompletionMonths', () => {
  it('returns null for zero contribution when target not yet met', () => {
    expect(
      estimateCompletionMonths({
        target: 10_000,
        currentBalance: 1_000,
        monthlyContribution: 0,
        annualGrowthRatePercent: 0,
        annualInflationRatePercent: 3,
        useInflation: false,
      })
    ).toBeNull();
  });
});

describe('realReturnPercent', () => {
  it('uses the Fisher equation', () => {
    const real = realReturnPercent(7, 3);
    expect(real).toBeCloseTo(((1.07 / 1.03 - 1) * 100), 5);
  });
});
