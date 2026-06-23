/** Upper bound when searching for a reachable completion month (150 years). */
export const COMPLETION_SEARCH_MAX_MONTHS = 150 * 12;

/** @deprecated Use {@link COMPLETION_SEARCH_MAX_MONTHS}. */
export const PROJECTION_MAX_MONTHS = COMPLETION_SEARCH_MAX_MONTHS;

/**
 * Future value with monthly contributions at period start and annual growth applied each year.
 * `annualGrowthRate` is a decimal (e.g. 0.05 for 5%).
 */
export function futureValueNominal(
  currentBalance: number,
  monthlyContribution: number,
  annualGrowthRate: number,
  months: number
): number {
  const monthsRounded = Math.max(Math.round(months), 0);
  if (monthsRounded === 0) return currentBalance;

  let balance = currentBalance;
  for (let month = 1; month <= monthsRounded; month += 1) {
    balance += monthlyContribution;
    if (month % 12 === 0) {
      balance *= 1 + annualGrowthRate;
    }
  }

  return balance;
}

export function inflateAmount(amountToday: number, annualInflation: number, years: number) {
  return amountToday * Math.pow(1 + annualInflation, years);
}

export function toRealValue(nominalValue: number, annualInflation: number, years: number) {
  if (years <= 0) return nominalValue;
  return nominalValue / Math.pow(1 + annualInflation, years);
}

/** Fisher equation: (1 + r) / (1 + i) − 1, as percent. */
export function realReturnPercent(nominalPercent: number, inflationPercent: number): number {
  const nominal = nominalPercent / 100;
  const inflation = inflationPercent / 100;
  if (!Number.isFinite(nominal) || !Number.isFinite(inflation)) return 0;
  if (1 + inflation <= 0) return 0;

  return ((1 + nominal) / (1 + inflation) - 1) * 100;
}

export function monthsUntilBalanceReachesTarget(
  target: number,
  currentBalance: number,
  monthlyContribution: number,
  annualGrowthRate: number
): number | null {
  if (currentBalance >= target) return 0;
  if (monthlyContribution <= 0 && annualGrowthRate <= 0) return null;

  for (let month = 1; month <= COMPLETION_SEARCH_MAX_MONTHS; month += 1) {
    const balance = futureValueNominal(
      currentBalance,
      monthlyContribution,
      annualGrowthRate,
      month
    );
    if (balance >= target) return month;
  }

  return null;
}

export function monthsUntilInflatedTarget(
  targetToday: number,
  currentBalance: number,
  monthlyContribution: number,
  annualGrowthRate: number,
  annualInflationRate: number
): number | null {
  if (currentBalance >= targetToday) return 0;
  if (monthlyContribution <= 0) return null;

  for (let month = 1; month <= COMPLETION_SEARCH_MAX_MONTHS; month += 1) {
    const balance = futureValueNominal(
      currentBalance,
      monthlyContribution,
      annualGrowthRate,
      month
    );
    const yearsElapsed = month / 12;
    const inflatedTarget = inflateAmount(targetToday, annualInflationRate, yearsElapsed);
    if (balance >= inflatedTarget) return month;
  }

  return null;
}

export function estimateCompletionMonths(params: {
  target: number;
  currentBalance: number;
  monthlyContribution: number;
  annualGrowthRatePercent: number;
  annualInflationRatePercent: number;
  useInflation?: boolean;
}): number | null {
  const growth = params.annualGrowthRatePercent / 100;
  const inflation = params.annualInflationRatePercent / 100;
  const months =
    params.useInflation === false
      ? monthsUntilBalanceReachesTarget(
          params.target,
          params.currentBalance,
          params.monthlyContribution,
          growth
        )
      : monthsUntilInflatedTarget(
          params.target,
          params.currentBalance,
          params.monthlyContribution,
          growth,
          inflation
        );

  return months != null && Number.isFinite(months) ? months : null;
}

export function monthsUntilTarget(target: number, current: number, monthly: number) {
  const remaining = Math.max(target - current, 0);
  if (remaining === 0) return 0;
  if (monthly <= 0) return Infinity;
  return Math.ceil(remaining / monthly);
}
