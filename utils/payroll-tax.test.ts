import { describe, expect, it } from 'vitest';

import { estimateEmployeePayrollTax, estimateHouseholdEmployeePayrollTax } from '@/utils/payroll-tax';

describe('estimateEmployeePayrollTax', () => {
  it('applies OASDI and Medicare on typical wages', () => {
    const tax = estimateEmployeePayrollTax(70_000, 'married_joint');
    expect(tax.socialSecurityTax).toBe(4_340);
    expect(tax.medicareTax).toBe(1_015);
    expect(tax.additionalMedicareTax).toBe(0);
    expect(tax.totalPayrollTax).toBe(5_355);
  });

  it('caps Social Security tax at the wage base', () => {
    const tax = estimateEmployeePayrollTax(200_000, 'single');
    expect(tax.socialSecurityTax).toBe(Math.round(176_100 * 0.062));
  });
});

describe('estimateHouseholdEmployeePayrollTax', () => {
  it('sums payroll tax across earners', () => {
    const total = estimateHouseholdEmployeePayrollTax([70_000, 50_000], 'married_joint');
    expect(total).toBe(
      estimateEmployeePayrollTax(70_000, 'married_joint').totalPayrollTax +
        estimateEmployeePayrollTax(50_000, 'married_joint').totalPayrollTax
    );
  });
});
