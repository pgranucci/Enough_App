import type { FilingStatus } from '@/constants/profile';
import { getStateName, type USStateCode } from '@/constants/us-states';
import { calculateStateIncomeTax } from '@/utils/state-income-tax';

type BracketSlice = { upTo: number; rate: number };

const STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  single: 15000,
  married_joint: 30000,
  married_separate: 15000,
  head_of_household: 22500,
};

const BRACKETS_2025: Record<FilingStatus, BracketSlice[]> = {
  single: [
    { upTo: 11925, rate: 0.1 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { upTo: 23850, rate: 0.1 },
    { upTo: 96950, rate: 0.12 },
    { upTo: 206700, rate: 0.22 },
    { upTo: 394600, rate: 0.24 },
    { upTo: 501050, rate: 0.32 },
    { upTo: 751600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married_separate: [
    { upTo: 11925, rate: 0.1 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 375800, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { upTo: 17000, rate: 0.1 },
    { upTo: 64850, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250500, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

export type IncomeTaxEstimate = {
  grossIncome: number;
  taxableIncome: number;
  estimatedFederalTax: number;
  estimatedMarginalRate: number;
  estimatedFederalBracketLabel: string;
  stateAppliesIncomeTax: boolean;
  stateOfResidenceLabel: string;
  estimatedStateTax: number;
  estimatedStateBracketLabel: string;
  estimatedTotalTax: number;
  estimatedNetIncome: number;
  effectiveTaxRatePercent: number;
};

function calculateFederalIncomeTax(taxableIncome: number, filingStatus: FilingStatus) {
  const brackets = BRACKETS_2025[filingStatus];
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= previousLimit) break;

    const incomeInBracket = Math.min(taxableIncome, bracket.upTo) - previousLimit;
    tax += incomeInBracket * bracket.rate;
    previousLimit = bracket.upTo;

    if (taxableIncome <= bracket.upTo) break;
  }

  return tax;
}

function getMarginalRate(taxableIncome: number, filingStatus: FilingStatus) {
  const brackets = BRACKETS_2025[filingStatus];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.upTo) {
      return bracket.rate;
    }
  }

  return brackets[brackets.length - 1].rate;
}

/** Federal + state income tax estimate on annual gross (2025 brackets, standard deduction). */
export function estimateAnnualIncomeTax(
  grossIncome: number,
  filingStatus: FilingStatus,
  stateOfResidence: USStateCode
): IncomeTaxEstimate {
  const gross = Math.max(grossIncome, 0);
  const standardDeduction = STANDARD_DEDUCTION_2025[filingStatus];
  const taxableIncome = Math.max(gross - standardDeduction, 0);
  const estimatedFederalTax = calculateFederalIncomeTax(taxableIncome, filingStatus);
  const estimatedMarginalRate = getMarginalRate(taxableIncome, filingStatus);
  const stateTax = calculateStateIncomeTax(
    stateOfResidence,
    filingStatus,
    gross,
    taxableIncome
  );
  const estimatedTotalTax = estimatedFederalTax + stateTax.estimatedStateTax;
  const estimatedNetIncome = Math.max(gross - estimatedTotalTax, 0);
  const effectiveTaxRatePercent =
    gross > 0 ? Math.round((estimatedTotalTax / gross) * 1000) / 10 : 0;

  return {
    grossIncome: Math.round(gross),
    taxableIncome: Math.round(taxableIncome),
    estimatedFederalTax: Math.round(estimatedFederalTax),
    estimatedMarginalRate,
    estimatedFederalBracketLabel: `${Math.round(estimatedMarginalRate * 100)}%`,
    stateAppliesIncomeTax: stateTax.applies,
    stateOfResidenceLabel: getStateName(stateOfResidence),
    estimatedStateTax: stateTax.estimatedStateTax,
    estimatedStateBracketLabel: stateTax.estimatedStateBracketLabel,
    estimatedTotalTax: Math.round(estimatedTotalTax),
    estimatedNetIncome: Math.round(estimatedNetIncome),
    effectiveTaxRatePercent,
  };
}
