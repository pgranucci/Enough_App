/**
 * Federal + state income tax estimates used by retirement withdrawal math.
 *
 *   npx vitest run src/core/retirement/income-tax-estimate.test.ts
 */
import { describe, expect, it } from 'vitest';

import { estimateAnnualIncomeTax } from '@/utils/income-tax-estimate';
import { preTaxWithdrawalTaxRatePercent } from '@/utils/retirement-income-tax';
import { makeRetirement } from '@/src/core/retirement/fixtures';

describe('estimateAnnualIncomeTax — locked 2025 brackets', () => {
  it('TX single $60,000 gross', () => {
    const est = estimateAnnualIncomeTax(60_000, 'single', 'TX');
    expect(est).toMatchObject({
      grossIncome: 60_000,
      taxableIncome: 45_000,
      estimatedFederalTax: 5_162,
      estimatedStateTax: 0,
      estimatedNetIncome: 54_839,
      effectiveTaxRatePercent: 8.6,
      stateAppliesIncomeTax: false,
    });
  });

  it('TX single $80,000 gross (solo TX accumulation lifestyle)', () => {
    const est = estimateAnnualIncomeTax(80_000, 'single', 'TX');
    expect(est).toMatchObject({
      estimatedFederalTax: 9_214,
      estimatedStateTax: 0,
      estimatedNetIncome: 70_786,
      effectiveTaxRatePercent: 11.5,
    });
  });

  it('CA married joint $127,500 gross (partner progress profile)', () => {
    const est = estimateAnnualIncomeTax(127_500, 'married_joint', 'CA');
    expect(est).toMatchObject({
      grossIncome: 127_500,
      taxableIncome: 97_500,
      estimatedFederalTax: 11_278,
      estimatedStateTax: 4_234,
      estimatedNetIncome: 111_988,
      effectiveTaxRatePercent: 12.2,
      stateAppliesIncomeTax: true,
    });
  });

  it('CA single $60,000 gross', () => {
    const est = estimateAnnualIncomeTax(60_000, 'single', 'CA');
    expect(est).toMatchObject({
      estimatedFederalTax: 5_162,
      estimatedStateTax: 1_845,
      estimatedNetIncome: 52_994,
      effectiveTaxRatePercent: 11.7,
    });
  });
});

describe('preTaxWithdrawalTaxRatePercent matches tax estimate', () => {
  it('uses retirement location settings, not current profile', () => {
    const caRetirement = makeRetirement({
      retirementStateOfResidence: 'CA',
      retirementFilingStatus: 'married_joint',
    });
    expect(preTaxWithdrawalTaxRatePercent(caRetirement, 127_500)).toBe(12.2);
    expect(preTaxWithdrawalTaxRatePercent(caRetirement, 80_000)).toBe(8.8);
  });
});
