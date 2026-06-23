import { describe, expect, it } from 'vitest';

import {
  defaultGoalTargetMonth,
  goalHorizonYearsFromTargetMonth,
  monthsUntilGoalTarget,
  parseGoalTargetMonthAnswer,
} from '@/utils/goal-target-date';

describe('goal-target-date', () => {
  const from = new Date(2026, 4, 15); // May 15, 2026

  it('parses MM/YYYY answers to ISO month', () => {
    expect(parseGoalTargetMonthAnswer('05/2030')).toBe('2030-05-01');
  });

  it('computes months until a target month', () => {
    expect(monthsUntilGoalTarget('2030-05-01', from)).toBe(48);
  });

  it('derives goal horizon years from a target month', () => {
    expect(goalHorizonYearsFromTargetMonth('2030-05-01', from)).toBe(4);
  });

  it('builds default target months ahead', () => {
    expect(defaultGoalTargetMonth(12, from)).toBe('2027-05-01');
  });
});
