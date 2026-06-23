import {
  futureValueNominal,
  realReturnPercent,
} from '@/src/core/shared/projection';
import { addMonthsToIso } from '@/src/core/shared/dates';
import { finiteNonNeg } from '@/src/core/shared/numbers';

export type RetirementSimulationInput = {
  currentAge: number;
  retirementAge: number;
  balanceToday: number;
  monthlyContribution: number;
  nominalAnnualReturnPercent: number;
  inflationAssumptionPercent: number;
  /** When set (e.g. from date of birth), overrides age-based month count. */
  monthsUntilRetirement?: number;
};

export type RetirementSimulationResult = {
  yearsUntilRetirement: number;
  monthsUntilRetirement: number;
  realAnnualReturnPercent: number;
  projectedBalanceAtRetirement: number;
  retirementDateIso: string;
};

export function simulateRetirement(
  input: RetirementSimulationInput
): RetirementSimulationResult {
  const currentAge = finiteNonNeg(input.currentAge);
  const retirementAge = Math.max(currentAge, finiteNonNeg(input.retirementAge));
  const yearsFromAge = Math.max(retirementAge - currentAge, 0);
  const monthsUntilRetirement =
    input.monthsUntilRetirement != null
      ? Math.max(Math.round(input.monthsUntilRetirement), 0)
      : Math.round(yearsFromAge * 12);
  const yearsUntilRetirement = monthsUntilRetirement / 12;

  const balanceToday = finiteNonNeg(input.balanceToday);
  const monthlyContribution = finiteNonNeg(input.monthlyContribution);
  const realAnnualReturnPercent = realReturnPercent(
    input.nominalAnnualReturnPercent,
    input.inflationAssumptionPercent
  );
  const annualGrowthRate = realAnnualReturnPercent / 100;

  const projectedBalanceAtRetirement = Math.round(
    futureValueNominal(
      balanceToday,
      monthlyContribution,
      annualGrowthRate,
      monthsUntilRetirement
    )
  );

  return {
    yearsUntilRetirement,
    monthsUntilRetirement,
    realAnnualReturnPercent,
    projectedBalanceAtRetirement,
    retirementDateIso: addMonthsToIso(monthsUntilRetirement),
  };
}
