/**
 * Simple retirement FV — short-term (cash) vs aggressive mix.
 *
 *   npx vitest run src/core/retirement/retirement-fv-mix-crosscheck.test.ts
 */
import { describe, expect, it } from 'vitest';

import { investmentMixReturnPercent } from '@/src/core/growth/returns';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import { simulateRetirement } from '@/src/core/retirement/engine';
import {
  futureValueNominal,
  realReturnPercent,
} from '@/src/core/shared/projection';

const INFLATION = 2.5;
const retirement = {
  ...DEFAULT_RETIREMENT_INPUTS,
  inflationAssumption: INFLATION,
  investmentGrowthMode: 'balanced' as const,
};

/** Cash / short-term mix → 0% nominal (see `investmentMixReturnPercent('cash', …)`). */
const NOMINAL_SHORT = investmentMixReturnPercent('cash', retirement);
const NOMINAL_AGGRESSIVE = investmentMixReturnPercent('aggressive', retirement);

const BASE = {
  currentAge: 45,
  retirementAge: 55,
  balanceToday: 50_000,
  monthlyContribution: 0,
  inflationAssumptionPercent: INFLATION,
};

describe('retirement FV — short-term vs aggressive (simple)', () => {
  it('short-term (0% nominal) → negative real, lower FV in today’s dollars', () => {
    expect(NOMINAL_SHORT).toBe(0);

    const realPct = realReturnPercent(NOMINAL_SHORT, INFLATION);
    expect(realPct).toBeCloseTo(-2.439, 2);

    const result = simulateRetirement({
      ...BASE,
      nominalAnnualReturnPercent: NOMINAL_SHORT,
    });

    expect(result.monthsUntilRetirement).toBe(120);
    expect(result.realAnnualReturnPercent).toBeCloseTo(realPct, 3);

    const fvManual = Math.round(
      futureValueNominal(50_000, 0, realPct / 100, 120)
    );
    expect(result.projectedBalanceAtRetirement).toBe(fvManual);
    expect(result.projectedBalanceAtRetirement).toBe(39_060);
  });

  it('aggressive (10% nominal) → positive real, higher FV', () => {
    expect(NOMINAL_AGGRESSIVE).toBe(10);

    const realPct = realReturnPercent(NOMINAL_AGGRESSIVE, INFLATION);
    expect(realPct).toBeCloseTo(7.317, 2);

    const result = simulateRetirement({
      ...BASE,
      nominalAnnualReturnPercent: NOMINAL_AGGRESSIVE,
    });

    expect(result.monthsUntilRetirement).toBe(120);
    expect(result.realAnnualReturnPercent).toBeCloseTo(realPct, 3);

    const fvManual = Math.round(
      futureValueNominal(50_000, 0, realPct / 100, 120)
    );
    expect(result.projectedBalanceAtRetirement).toBe(fvManual);
    expect(result.projectedBalanceAtRetirement).toBe(101_311);
  });
});
