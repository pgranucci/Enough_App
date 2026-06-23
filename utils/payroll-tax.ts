import type { FilingStatus } from '@/constants/profile';

/** OASDI taxable wage base (2025). */
export const SOCIAL_SECURITY_WAGE_BASE = 176_100;

const OASDI_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;

function additionalMedicareThreshold(filingStatus: FilingStatus): number {
  switch (filingStatus) {
    case 'married_joint':
      return 250_000;
    case 'married_separate':
      return 125_000;
    default:
      return 200_000;
  }
}

export type EmployeePayrollTaxBreakdown = {
  wages: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalPayrollTax: number;
};

/** Employee FICA on W-2 wages (OASDI + Medicare + additional Medicare). */
export function estimateEmployeePayrollTax(
  wages: number,
  filingStatus: FilingStatus
): EmployeePayrollTaxBreakdown {
  const gross = Math.max(wages, 0);
  if (gross <= 0) {
    return {
      wages: 0,
      socialSecurityTax: 0,
      medicareTax: 0,
      additionalMedicareTax: 0,
      totalPayrollTax: 0,
    };
  }

  const socialSecurityTax = Math.min(gross, SOCIAL_SECURITY_WAGE_BASE) * OASDI_RATE;
  const medicareTax = gross * MEDICARE_RATE;
  const additionalThreshold = additionalMedicareThreshold(filingStatus);
  const additionalMedicareTax =
    gross > additionalThreshold ? (gross - additionalThreshold) * ADDITIONAL_MEDICARE_RATE : 0;
  const totalPayrollTax = socialSecurityTax + medicareTax + additionalMedicareTax;

  return {
    wages: Math.round(gross),
    socialSecurityTax: Math.round(socialSecurityTax),
    medicareTax: Math.round(medicareTax),
    additionalMedicareTax: Math.round(additionalMedicareTax),
    totalPayrollTax: Math.round(totalPayrollTax),
  };
}

/** Sum employee payroll tax across one or more wage earners in a household year. */
export function estimateHouseholdEmployeePayrollTax(
  wagesByEarner: number[],
  filingStatus: FilingStatus
): number {
  return wagesByEarner.reduce(
    (sum, wages) => sum + estimateEmployeePayrollTax(wages, filingStatus).totalPayrollTax,
    0
  );
}
