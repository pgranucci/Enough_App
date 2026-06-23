import type { ExpenseInputs } from '@/constants/profile';
import { getDefaultCoreBucketTarget, type ExpenseDerivedBucketTargets } from '@/constants/buckets';

import { isObligationActiveThroughMonth } from '@/src/core/shared/dates';
import { finiteNonNeg } from '@/src/core/shared/numbers';

export const DEFAULT_EMERGENCY_COVERAGE_MONTHS = 6;
export const DEFAULT_SLUSH_COVERAGE_MONTHS = 3;

/** @deprecated Use {@link DEFAULT_SLUSH_COVERAGE_MONTHS}. */
export const SLUSH_FUND_MONTHS = DEFAULT_SLUSH_COVERAGE_MONTHS;

function isDebtActiveForBuckets(maturityDate: string, now: Date = new Date()): boolean {
  return isObligationActiveThroughMonth(maturityDate, now);
}

export function isMortgageActiveForBuckets(
  mortgage: ExpenseInputs['mortgage'],
  now: Date = new Date()
): boolean {
  if (!mortgage.hasMortgage || mortgage.mortgagePaidOff) return false;
  return isObligationActiveThroughMonth(mortgage.maturityDate, now);
}

function emergencyMonths(expenses: ExpenseInputs): number {
  const m = expenses.emergencyCoverageMonths;
  if (!Number.isFinite(m)) return DEFAULT_EMERGENCY_COVERAGE_MONTHS;
  return Math.min(24, Math.max(1, Math.round(m)));
}

function slushCoverageMonthsValue(expenses: ExpenseInputs): number {
  const m = expenses.slushCoverageMonths;
  if (!Number.isFinite(m)) return DEFAULT_SLUSH_COVERAGE_MONTHS;
  return Math.min(24, Math.max(1, Math.round(m)));
}

export function monthlyHousingObligationForEmergency(expenses: ExpenseInputs): number {
  if (expenses.housingSituation === 'rent') {
    return finiteNonNeg(expenses.monthlyHousingCost);
  }
  if (isMortgageActiveForBuckets(expenses.mortgage)) {
    return finiteNonNeg(expenses.mortgage.monthlyPayment);
  }
  return finiteNonNeg(expenses.monthlyHousingCost);
}

export function computeEmergencyMonthlyFloor(expenses: ExpenseInputs): number {
  const essentials = finiteNonNeg(expenses.monthlyEssentialsExHousing);
  const housing = monthlyHousingObligationForEmergency(expenses);
  const debtPayments = expenses.nonMortgageDebts.reduce(
    (sum, d) =>
      isDebtActiveForBuckets(d.maturityDate) ? sum + finiteNonNeg(d.monthlyPayment) : sum,
    0
  );
  return essentials + housing + debtPayments;
}

export function computeMonthlyTotalExpenses(expenses: ExpenseInputs): number {
  return computeEmergencyMonthlyFloor(expenses) + finiteNonNeg(expenses.monthlyDiscretionary);
}

export function resolveEmergencySlushTargets(expenses: ExpenseInputs): {
  emergency: number;
  slush: number;
} {
  const monthlyFloor = computeEmergencyMonthlyFloor(expenses);
  const months = emergencyMonths(expenses);
  const emergency =
    monthlyFloor > 0
      ? Math.round(monthlyFloor * months)
      : Math.round(
          (getDefaultCoreBucketTarget('emergency') / DEFAULT_EMERGENCY_COVERAGE_MONTHS) * months
        );

  const slush = computeSlushFundTarget(expenses, getDefaultCoreBucketTarget('slush'));
  return { emergency, slush };
}

export function computeNecessaryEmergencyTarget(expenses: ExpenseInputs): number | null {
  const monthlyFloor = computeEmergencyMonthlyFloor(expenses);
  if (monthlyFloor <= 0) return null;
  return Math.round(monthlyFloor * emergencyMonths(expenses));
}

export function computeSlushFundTarget(
  expenses: ExpenseInputs,
  coreSlushAnchorTarget: number
): number {
  const total = computeMonthlyTotalExpenses(expenses);
  const months = slushCoverageMonthsValue(expenses);
  const anchor =
    coreSlushAnchorTarget > 0 ? coreSlushAnchorTarget : getDefaultCoreBucketTarget('slush');
  if (total > 0) {
    return Math.round(total * months);
  }
  return Math.round((anchor / DEFAULT_SLUSH_COVERAGE_MONTHS) * months);
}

export function resolvePartialExpenseBucketTargets(
  expenses: ExpenseInputs,
  coreEmergencyAnchorTarget: number,
  coreSlushAnchorTarget: number
): ExpenseDerivedBucketTargets {
  const floor = computeEmergencyMonthlyFloor(expenses);
  const months = emergencyMonths(expenses);
  const anchor =
    coreEmergencyAnchorTarget > 0
      ? coreEmergencyAnchorTarget
      : getDefaultCoreBucketTarget('emergency');

  const emergency =
    floor > 0
      ? Math.round(floor * months)
      : Math.round((anchor / DEFAULT_EMERGENCY_COVERAGE_MONTHS) * months);

  const slush = computeSlushFundTarget(expenses, coreSlushAnchorTarget);
  return { emergency, slush };
}
