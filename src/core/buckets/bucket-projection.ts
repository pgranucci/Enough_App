import { clamp } from '@/utils/numbers';

import { addMonthsToIso } from '@/src/core/shared/dates';
import {
  COMPLETION_SEARCH_MAX_MONTHS,
  estimateCompletionMonths,
  futureValueNominal,
  inflateAmount,
  toRealValue,
} from '@/src/core/shared/projection';

export type ProjectionParams = {
  currentBalance: number;
  monthlyContribution: number;
  annualGrowthRatePercent: number;
  annualInflationRatePercent: number;
  yearsUntilTarget: number;
  targetInTodayDollars?: number;
  useInflationAdjustedTarget?: boolean;
};

export type ProjectionResult = {
  projectedFutureValue: number;
  projectedFutureValueReal: number;
  inflationAdjustedTarget?: number;
  estimatedCompletionDate: string | null;
  monthsUntilTarget: number;
  annualGrowthRatePercent: number;
  annualInflationRatePercent: number;
  yearsUntilTarget: number;
};

export function calculateProjection(params: ProjectionParams): ProjectionResult {
  const annualGrowthRate = params.annualGrowthRatePercent / 100;
  const annualInflationRate = params.annualInflationRatePercent / 100;

  let completionMonths: number | null;
  let yearsUntilTarget: number;

  if (params.targetInTodayDollars != null && params.targetInTodayDollars > 0) {
    completionMonths = estimateCompletionMonths({
      target: params.targetInTodayDollars,
      currentBalance: params.currentBalance,
      monthlyContribution: params.monthlyContribution,
      annualGrowthRatePercent: params.annualGrowthRatePercent,
      annualInflationRatePercent: params.annualInflationRatePercent,
      useInflation: params.useInflationAdjustedTarget !== false,
    });
    yearsUntilTarget = completionMonths != null ? completionMonths / 12 : 0;
  } else {
    yearsUntilTarget = Math.max(params.yearsUntilTarget, 0);
    completionMonths = Math.max(Math.round(yearsUntilTarget * 12), 0);
  }

  const projectionHorizonMonths = completionMonths ?? COMPLETION_SEARCH_MAX_MONTHS;

  const projectedFutureValue = futureValueNominal(
    params.currentBalance,
    params.monthlyContribution,
    annualGrowthRate,
    projectionHorizonMonths
  );

  const projectedFutureValueReal = toRealValue(
    projectedFutureValue,
    annualInflationRate,
    yearsUntilTarget
  );

  const inflationAdjustedTarget =
    params.targetInTodayDollars != null
      ? inflateAmount(params.targetInTodayDollars, annualInflationRate, yearsUntilTarget)
      : undefined;

  return {
    projectedFutureValue: Math.round(projectedFutureValue),
    projectedFutureValueReal: Math.round(projectedFutureValueReal),
    inflationAdjustedTarget:
      inflationAdjustedTarget != null ? Math.round(inflationAdjustedTarget) : undefined,
    estimatedCompletionDate:
      completionMonths != null ? addMonthsToIso(completionMonths) : null,
    monthsUntilTarget: completionMonths ?? 0,
    annualGrowthRatePercent: params.annualGrowthRatePercent,
    annualInflationRatePercent: params.annualInflationRatePercent,
    yearsUntilTarget,
  };
}

export function projectFutureValue(
  current: number,
  monthly: number,
  months: number,
  _target: number,
  annualGrowthRatePercent = 7,
  annualInflationRatePercent = 3
) {
  const years = months / 12;
  const result = calculateProjection({
    currentBalance: current,
    monthlyContribution: monthly,
    annualGrowthRatePercent,
    annualInflationRatePercent,
    yearsUntilTarget: years,
  });

  return clamp(result.projectedFutureValue, 0, Number.MAX_SAFE_INTEGER);
}
