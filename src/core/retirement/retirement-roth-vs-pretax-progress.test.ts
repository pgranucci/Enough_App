/**
 * Roth vs pre-tax savings → retirement progress (Freedom readiness).
 *
 *   npx vitest run src/core/retirement/retirement-roth-vs-pretax-progress.test.ts
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { buildRetirementBucket } from '@/constants/buckets';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { preTaxWithdrawalTaxRatePercent } from '@/utils/retirement-income-tax';
import { simulateRetirement } from '@/src/core/retirement/engine';
import { realReturnPercent } from '@/src/core/shared/projection';

import { FIXTURE_SALARY_PROFILE, makeRetirement } from '@/src/core/retirement/fixtures';

const profile = FIXTURE_SALARY_PROFILE;

const BASE = makeRetirement({
  currentAge: 40,
  retirementAge: 65,
  desiredAnnualGrossIncome: 60_000,
  socialSecurityMode: 'excluded',
  socialSecurityEstimate: 0,
  pensionEstimate: 0,
  otherIncomeStreams: [],
  expectedAnnualReturn: 7.5,
  inflationAssumption: 2.5,
  retirementStateOfResidence: 'TX',
  retirementFilingStatus: 'single',
  lifeExpectancy: 90,
});

function planFor(traditionalBalance: number, rothBalance: number, monthlyContributions: number) {
  return calculateRetirementPlan(
    {
      ...BASE,
      traditionalBalance,
      rothBalance,
      monthlyContributions,
      accounts: [],
    },
    profile
  );
}

describe('Roth vs pre-tax progress cross-check', () => {
  it('same nominal balance and savings — Roth shows higher gross-equiv readiness', () => {
    const monthly = 500;
    const start = 50_000;
    const taxRate = preTaxWithdrawalTaxRatePercent(BASE, 60_000);
    const real = realReturnPercent(7.5, 2.5) / 100;

    const rothOnly = planFor(0, start, monthly);
    const preTaxOnly = planFor(start, 0, monthly);

    expect(rothOnly.requiredPortfolioTarget).toBeLessThan(preTaxOnly.requiredPortfolioTarget);
    expect(rothOnly.requiredPortfolioTarget).toBe(837_273);
    expect(preTaxOnly.requiredPortfolioTarget).toBe(916_074);

    const fvNominal = Math.round(
      simulateRetirement({
        currentAge: 40,
        retirementAge: 65,
        balanceToday: start,
        monthlyContribution: monthly,
        nominalAnnualReturnPercent: 7.5,
        inflationAssumptionPercent: 2.5,
      }).projectedBalanceAtRetirement
    );

    expect(rothOnly.futureValueInvestments).toBe(fvNominal);
    expect(preTaxOnly.futureValueInvestments).toBe(fvNominal);

    const grossEquivRoth = Math.round(fvNominal / (1 - taxRate / 100));
    expect(rothOnly.futureGrossEquivalentPortfolio).toBe(grossEquivRoth);
    expect(preTaxOnly.futureGrossEquivalentPortfolio).toBe(fvNominal);

    expect(rothOnly.projectedReadinessPercent).toBeGreaterThan(
      preTaxOnly.projectedReadinessPercent
    );

    const bucketRoth = buildRetirementBucket(
      { ...BASE, traditionalBalance: 0, rothBalance: start, monthlyContributions: monthly },
      profile
    );
    const bucketPreTax = buildRetirementBucket(
      { ...BASE, traditionalBalance: start, rothBalance: 0, monthlyContributions: monthly },
      profile
    );

    expect(bucketRoth.readinessProgress).toBeCloseTo(
      rothOnly.futureGrossEquivalentPortfolio / rothOnly.requiredPortfolioTarget,
      3
    );
    expect(bucketPreTax.readinessProgress).toBeCloseTo(
      preTaxOnly.futureGrossEquivalentPortfolio / preTaxOnly.requiredPortfolioTarget,
      3
    );

    const lines = [
      '',
      '=== Roth vs pre-tax progress (same inputs) ===',
      `Required portfolio — Roth only: $${rothOnly.requiredPortfolioTarget.toLocaleString()}`,
      `Required portfolio — pre-tax only: $${preTaxOnly.requiredPortfolioTarget.toLocaleString()}`,
      `Withdrawal tax rate on $60k gross: ${taxRate}%`,
      `Start $50,000, save $500/mo, age 40→65, real ${(real * 100).toFixed(3)}%`,
      '',
      'Scenario A — save Roth only:',
      `  Nominal FV at 65: $${rothOnly.futureValueInvestments.toLocaleString()}`,
      `  Gross-equivalent FV: $${rothOnly.futureGrossEquivalentPortfolio.toLocaleString()}`,
      `  Readiness: ${rothOnly.projectedReadinessPercent}%`,
      '',
      'Scenario B — save pre-tax only:',
      `  Nominal FV at 65: $${preTaxOnly.futureValueInvestments.toLocaleString()}`,
      `  Gross-equivalent FV: $${preTaxOnly.futureGrossEquivalentPortfolio.toLocaleString()}`,
      `  Readiness: ${preTaxOnly.projectedReadinessPercent}%`,
      '',
    ];
    writeFileSync('retirement-roth-vs-pretax-progress-output.txt', lines.join('\n'), 'utf8');
  });
});
