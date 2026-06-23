import { describe, expect, it } from 'vitest';

import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';

import { makeRetirement } from '@/src/core/retirement/fixtures';

describe('applyIncomeReplacementToRetirement', () => {
  it('sets desired gross from household income × replacement percent', () => {
    const retirement = makeRetirement({ incomeReplacementPercent: 80 });
    const next = applyIncomeReplacementToRetirement(retirement, 100_000);
    expect(next.desiredAnnualGrossIncome).toBe(80_000);
    expect(next.incomeReplacementPercent).toBe(80);
  });

  it('leaves desired income unchanged when household gross is zero', () => {
    const retirement = makeRetirement({ desiredAnnualGrossIncome: 60_000 });
    const next = applyIncomeReplacementToRetirement(retirement, 0);
    expect(next.desiredAnnualGrossIncome).toBe(60_000);
  });
});
