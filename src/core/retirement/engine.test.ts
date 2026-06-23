import { describe, expect, it } from 'vitest';

import { simulateRetirement } from '@/src/core/retirement/engine';

describe('simulateRetirement', () => {
  it('honors an explicit monthsUntilRetirement override', () => {
    const fromAge = simulateRetirement({
      currentAge: 40,
      retirementAge: 65,
      balanceToday: 0,
      monthlyContribution: 0,
      nominalAnnualReturnPercent: 7,
      inflationAssumptionPercent: 3,
    });
    const fromMonths = simulateRetirement({
      currentAge: 40,
      retirementAge: 50,
      monthsUntilRetirement: 180,
      balanceToday: 0,
      monthlyContribution: 0,
      nominalAnnualReturnPercent: 7,
      inflationAssumptionPercent: 3,
    });

    expect(fromMonths.monthsUntilRetirement).toBe(180);
    expect(fromMonths.monthsUntilRetirement).not.toBe(fromAge.monthsUntilRetirement);
  });

  it('projects balance at retirement using real return', () => {
    const result = simulateRetirement({
      currentAge: 40,
      retirementAge: 65,
      balanceToday: 100_000,
      monthlyContribution: 500,
      nominalAnnualReturnPercent: 7,
      inflationAssumptionPercent: 3,
    });

    expect(result.yearsUntilRetirement).toBe(25);
    expect(result.monthsUntilRetirement).toBe(300);
    expect(result.realAnnualReturnPercent).toBeCloseTo(((1.07 / 1.03 - 1) * 100), 5);
    expect(result.projectedBalanceAtRetirement).toBeGreaterThan(100_000);
    expect(result.retirementDateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
