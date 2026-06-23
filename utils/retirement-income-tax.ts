import type { FilingStatus } from '@/constants/profile';
import { FILING_STATUS_OPTIONS } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import type { USStateCode } from '@/constants/us-states';
import { clamp } from '@/utils/numbers';
import { estimateAnnualIncomeTax, type IncomeTaxEstimate } from '@/utils/income-tax-estimate';

export type RetirementTaxLocation = Pick<
  RetirementInputs,
  'retirementStateOfResidence' | 'retirementFilingStatus'
>;

export function filingStatusLabel(filingStatus: FilingStatus): string {
  return FILING_STATUS_OPTIONS.find((option) => option.id === filingStatus)?.label ?? filingStatus;
}

/** Tax estimate on target gross retirement income using retirement location settings. */
export function estimateRetirementTargetIncomeTax(
  grossAnnualIncome: number,
  retirement: RetirementTaxLocation
): IncomeTaxEstimate {
  return estimateAnnualIncomeTax(
    grossAnnualIncome,
    retirement.retirementFilingStatus,
    retirement.retirementStateOfResidence
  );
}

export function grossToNetRetirementIncome(
  grossAnnualIncome: number,
  retirement: RetirementTaxLocation
): number {
  if (grossAnnualIncome <= 0) return 0;
  return estimateRetirementTargetIncomeTax(grossAnnualIncome, retirement).estimatedNetIncome;
}

/** Taxable gross for household income tax (Roth portfolio withdrawals are excluded). */
export function taxableHouseholdGrossIncome(
  knownGrossIncome: number,
  portfolioGrossWithdrawal: number,
  rothBalanceShare: number
): number {
  const rothShare = clamp(rothBalanceShare, 0, 1);
  const knownGross = Math.max(knownGrossIncome, 0);
  const portfolioGross = Math.max(portfolioGrossWithdrawal, 0);
  return knownGross + portfolioGross * (1 - rothShare);
}

/** Total cash received minus income tax and employee payroll tax (FICA) for a retirement year. */
export function householdNetIncomeAfterTax(
  knownGrossIncome: number,
  portfolioGrossWithdrawal: number,
  rothBalanceShare: number,
  taxLocation: RetirementTaxLocation,
  employeePayrollTax = 0
): number {
  const knownGross = Math.max(knownGrossIncome, 0);
  const portfolioGross = Math.max(portfolioGrossWithdrawal, 0);
  const taxableGross = taxableHouseholdGrossIncome(
    knownGross,
    portfolioGross,
    rothBalanceShare
  );
  const totalCashGross = knownGross + portfolioGross;
  const tax = estimateRetirementTargetIncomeTax(taxableGross, taxLocation);
  return totalCashGross - tax.estimatedTotalTax - Math.max(employeePayrollTax, 0);
}

export type PortfolioWithdrawalSolverOptions = {
  tolerance?: number;
  maxIterations?: number;
};

/**
 * Gross portfolio withdrawal needed so household net income reaches the lifestyle net goal,
 * recomputing federal + state tax on the full year's taxable income (known streams + pre-tax
 * portion of withdrawals). Roth withdrawals add cash but not taxable income.
 */
export function solvePortfolioGrossWithdrawalForHouseholdNetGoal(
  knownGrossIncome: number,
  rothBalanceShare: number,
  targetHouseholdNet: number,
  taxLocation: RetirementTaxLocation,
  options: PortfolioWithdrawalSolverOptions = {},
  employeePayrollTax = 0
): number {
  if (targetHouseholdNet <= 0) return 0;

  const knownGross = Math.max(knownGrossIncome, 0);
  const netWithoutPortfolio = householdNetIncomeAfterTax(
    knownGross,
    0,
    rothBalanceShare,
    taxLocation,
    employeePayrollTax
  );
  if (netWithoutPortfolio >= targetHouseholdNet) return 0;

  const tolerance = options.tolerance ?? 1;
  const maxIterations = options.maxIterations ?? 64;

  let lo = 0;
  let hi = Math.max(targetHouseholdNet - netWithoutPortfolio, 1) * 2 + knownGross;

  while (
    householdNetIncomeAfterTax(
      knownGross,
      hi,
      rothBalanceShare,
      taxLocation,
      employeePayrollTax
    ) < targetHouseholdNet
  ) {
    hi *= 2;
    if (hi > 50_000_000) break;
  }

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (lo + hi) / 2;
    const net = householdNetIncomeAfterTax(
      knownGross,
      mid,
      rothBalanceShare,
      taxLocation,
      employeePayrollTax
    );
    if (Math.abs(net - targetHouseholdNet) <= tolerance) return mid;
    if (net < targetHouseholdNet) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/**
 * Annual gross withdrawals from the portfolio needed to fund a net spending goal,
 * given projected Roth share and pre-tax withdrawal tax rate (federal + state).
 *
 * @deprecated Prefer {@link solvePortfolioGrossWithdrawalForHouseholdNetGoal} when other
 * income streams vary by year — this uses a single fixed effective tax rate.
 */
export function grossAnnualWithdrawalForNetNeed(
  netAnnualNeed: number,
  rothBalanceShare: number,
  preTaxWithdrawalTaxRatePercent: number
): number {
  if (netAnnualNeed <= 0) return 0;

  const rothShare = clamp(rothBalanceShare, 0, 1);
  const preTaxShare = 1 - rothShare;
  const taxRate = clamp(preTaxWithdrawalTaxRatePercent / 100, 0, 0.6);

  if (taxRate >= 1) return netAnnualNeed;
  return netAnnualNeed * (rothShare + preTaxShare / (1 - taxRate));
}

/** Pre-tax withdrawal tax rate used for portfolio withdrawal math (from income tax estimate). */
export function preTaxWithdrawalTaxRatePercent(
  retirement: RetirementTaxLocation,
  referenceGrossIncome: number
): number {
  const gross = Math.max(referenceGrossIncome, 0);
  if (gross <= 0) return 0;
  return estimateRetirementTargetIncomeTax(gross, retirement).effectiveTaxRatePercent;
}

/** Effective tax rate on total taxable household income for a retirement year. */
export function effectiveHouseholdTaxRatePercent(
  knownGrossIncome: number,
  portfolioGrossWithdrawal: number,
  rothBalanceShare: number,
  taxLocation: RetirementTaxLocation
): number {
  const taxableGross = taxableHouseholdGrossIncome(
    knownGrossIncome,
    portfolioGrossWithdrawal,
    rothBalanceShare
  );
  if (taxableGross <= 0) return 0;
  return estimateRetirementTargetIncomeTax(taxableGross, taxLocation).effectiveTaxRatePercent;
}
