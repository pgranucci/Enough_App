import { describe, expect, it } from 'vitest';

import { calculateProjection } from '@/src/core/buckets/bucket-projection';

describe('calculateProjection', () => {
  it('estimates completion in ~29 years for $30k target with $1k balance and $1k/yr at 0%', () => {
    const result = calculateProjection({
      currentBalance: 1_000,
      monthlyContribution: 1000 / 12,
      annualGrowthRatePercent: 0,
      annualInflationRatePercent: 0,
      yearsUntilTarget: 0,
      targetInTodayDollars: 30_000,
      useInflationAdjustedTarget: false,
    });

    expect(result.estimatedCompletionDate).not.toBeNull();
    expect(result.monthsUntilTarget).toBeGreaterThan(340);
    expect(result.monthsUntilTarget).toBeLessThan(360);
  });

  it('returns null completion date when contribution is zero and target is not met', () => {
    const result = calculateProjection({
      currentBalance: 1_000,
      monthlyContribution: 0,
      annualGrowthRatePercent: 0,
      annualInflationRatePercent: 3,
      yearsUntilTarget: 0,
      targetInTodayDollars: 30_000,
      useInflationAdjustedTarget: false,
    });

    expect(result.estimatedCompletionDate).toBeNull();
    expect(result.monthsUntilTarget).toBe(0);
  });
});
