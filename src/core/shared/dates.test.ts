import { describe, expect, it } from 'vitest';

import { isObligationActiveThroughMonth, toYearMonthKey } from '@/src/core/shared/dates';

describe('toYearMonthKey', () => {
  it('parses YYYY-MM and MM/YYYY', () => {
    expect(toYearMonthKey('2026-04-01')).toBe(202604);
    expect(toYearMonthKey('04/2026')).toBe(202604);
  });
});

describe('isObligationActiveThroughMonth', () => {
  it('is inactive after the payoff month', () => {
    const afterPayoff = new Date('2026-05-15T12:00:00Z');
    expect(isObligationActiveThroughMonth('2026-04-01', afterPayoff)).toBe(false);
  });

  it('is active through the payoff month', () => {
    const inPayoffMonth = new Date('2026-04-15T12:00:00Z');
    expect(isObligationActiveThroughMonth('2026-04-01', inPayoffMonth)).toBe(true);
  });
});
