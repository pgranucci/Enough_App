import type { RetirementInputs } from '@/constants/retirement';
import { normalizeFiniteNumber } from '@/utils/numbers';

export const DEFAULT_INCOME_REPLACEMENT_PERCENT = 100;

export function clampIncomeReplacementPercent(n: unknown): number {
  const x = normalizeFiniteNumber(n, DEFAULT_INCOME_REPLACEMENT_PERCENT);
  return Math.min(200, Math.max(0, Math.round(x)));
}

/** Infer replacement % from stored desired income and household gross (legacy rows). */
export function inferIncomeReplacementPercent(
  retirement: Pick<RetirementInputs, 'desiredAnnualGrossIncome' | 'incomeReplacementPercent'>,
  householdGrossAnnual: number
): number {
  if (
    retirement.incomeReplacementPercent != null &&
    Number.isFinite(retirement.incomeReplacementPercent)
  ) {
    return clampIncomeReplacementPercent(retirement.incomeReplacementPercent);
  }
  if (householdGrossAnnual > 0 && retirement.desiredAnnualGrossIncome > 0) {
    return clampIncomeReplacementPercent(
      (retirement.desiredAnnualGrossIncome / householdGrossAnnual) * 100
    );
  }
  return DEFAULT_INCOME_REPLACEMENT_PERCENT;
}

/** Keep `desiredAnnualGrossIncome` in sync with household gross × replacement %. */
export function applyIncomeReplacementToRetirement(
  retirement: RetirementInputs,
  householdGrossAnnual: number
): RetirementInputs {
  const percent = inferIncomeReplacementPercent(retirement, householdGrossAnnual);
  const desired =
    householdGrossAnnual > 0
      ? Math.round((householdGrossAnnual * percent) / 100)
      : Math.max(retirement.desiredAnnualGrossIncome, 0);

  return {
    ...retirement,
    incomeReplacementPercent: percent,
    desiredAnnualGrossIncome: desired,
  };
}
