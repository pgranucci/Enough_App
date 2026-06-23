/**
 * Partner household: one Roth + one pre-tax vs both pre-tax (SS excluded).
 *
 *   npx vitest run src/core/retirement/retirement-partner-roth-progress.test.ts
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { buildRetirementBucket } from '@/constants/buckets';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { getHouseholdAnnualIncome } from '@/constants/profile';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import {
  retirementInputsForBucket,
  syncRetirementFromBucketAccounts,
} from '@/utils/retirement-bucket-sync';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import { preTaxWithdrawalTaxRatePercent } from '@/utils/retirement-income-tax';

import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

const profile = makeProfile({
  planningMode: 'partner',
  partnerName: 'Alex',
  userName: 'Jordan',
  dateOfBirth: '',
  userAge: 40,
  partnerAge: 42,
  filingStatus: 'married_joint',
  annualIncome: 100_000,
  partnerAnnualIncome: 70_000,
  partnerBaseAnnualSalary: 70_000,
});

const householdGross = getHouseholdAnnualIncome(profile);

const baseRetirement = applyIncomeReplacementToRetirement(
  makeRetirement({
    currentAge: 40,
    retirementAge: 65,
    partnerRetirementAge: 65,
    incomeReplacementPercent: 75,
    socialSecurityMode: 'excluded',
    partnerSocialSecurityMode: 'excluded',
    socialSecurityEstimate: 0,
    partnerSocialSecurityEstimate: 0,
    pensionEstimate: 0,
    otherIncomeStreams: [],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'married_joint',
    lifeExpectancy: 90,
    partnerLifeExpectancy: 90,
  }),
  householdGross
);

function self401k(): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('retirement'),
    id: '401k-self',
    accountOwner: 'self',
    name: 'Jordan 401(k)',
    isEmployerPlan: true,
    preTaxCurrentValue: 80_000,
    rothCurrentValue: 0,
    currentValue: 80_000,
    investmentMix: 'balanced' as const,
    employeePreTaxContributionPercent: 8,
    employeeRothContributionPercent: 0,
    employerMatchPercent: 3,
    employerProfitSharingPercent: 0,
  };
}

function partnerRothIra(): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('retirement'),
    id: 'ira-partner-roth',
    accountOwner: 'partner',
    name: 'Alex Roth IRA',
    isEmployerPlan: false,
    isRoth: true,
    currentValue: 40_000,
    investmentMix: 'balanced' as const,
    annualContributionDollars: 6_000,
  };
}

function partnerPreTaxIra(): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('retirement'),
    id: 'ira-partner-pretax',
    accountOwner: 'partner',
    name: 'Alex Traditional IRA',
    isEmployerPlan: false,
    isRoth: false,
    currentValue: 40_000,
    investmentMix: 'balanced' as const,
    annualContributionDollars: 6_000,
  };
}

function runScenario(accounts: FinancialAccount[]) {
  const assignedIds = accounts.map((a) => a.id);
  const withAccounts = { ...baseRetirement, accounts };
  const inputs = retirementInputsForBucket(
    withAccounts,
    profile,
    householdGross,
    assignedIds
  );
  const plan = calculateRetirementPlan(inputs, profile);
  const projection = projectGrossEquivalentPortfolioAtRetirement(
    accounts,
    inputs,
    profile,
    plan.effectiveRetirementTaxRatePercentAtRetirement
  );
  const bucket = buildRetirementBucket(inputs, profile);
  const synced = syncRetirementFromBucketAccounts(accounts, profile);

  return { plan, projection, bucket, inputs, synced };
}

describe('partner Roth vs pre-tax progress (SS excluded)', () => {
  it('scenario 1 mixed vs scenario 2 all pre-tax', () => {
    expect(householdGross).toBe(170_000);
    expect(baseRetirement.desiredAnnualGrossIncome).toBe(127_500);

    const mixed = runScenario([self401k(), partnerRothIra()]);
    const allPreTax = runScenario([self401k(), partnerPreTaxIra()]);

    expect(mixed.plan.requiredPortfolioTarget).toBeLessThan(allPreTax.plan.requiredPortfolioTarget);
    expect(mixed.synced.traditionalBalance).toBe(80_000);
    expect(mixed.synced.rothBalance).toBe(40_000);
    expect(allPreTax.synced.traditionalBalance).toBe(120_000);
    expect(allPreTax.synced.rothBalance).toBe(0);

    expect(mixed.synced.monthlyContributions).toBeCloseTo(allPreTax.synced.monthlyContributions, 1);

    expect(mixed.projection.projectedNominal).toBe(allPreTax.projection.projectedNominal);
    expect(mixed.projection.projectedGrossEquivalent).toBeGreaterThan(
      allPreTax.projection.projectedGrossEquivalent
    );

    const taxRate = preTaxWithdrawalTaxRatePercent(baseRetirement, 127_500);
    const mixedReadiness = Math.round(mixed.bucket.readinessProgress! * 100);
    const preTaxReadiness = Math.round(allPreTax.bucket.readinessProgress! * 100);

    expect(mixedReadiness).toBe(68);
    expect(preTaxReadiness).toBe(63);
    expect(mixed.plan.projectedReadinessPercent).toBe(68);
    expect(allPreTax.plan.projectedReadinessPercent).toBe(63);
    expect(mixed.plan.requiredPortfolioTarget).toBe(1_861_102);
    expect(allPreTax.plan.requiredPortfolioTarget).toBe(1_946_662);
    expect(mixed.projection.projectedNominal).toBe(1_231_497);

    const lines = [
      '',
      '=== Partner: mixed Roth/pre-tax vs all pre-tax (SS excluded) ===',
      `Household gross: $${householdGross.toLocaleString()} → lifestyle $${baseRetirement.desiredAnnualGrossIncome.toLocaleString()} (75%)`,
      `Required portfolio — mixed (33% Roth): $${mixed.plan.requiredPortfolioTarget.toLocaleString()}`,
      `Required portfolio — all pre-tax: $${allPreTax.plan.requiredPortfolioTarget.toLocaleString()}`,
      `Tax rate on lifestyle (MFJ TX): ${taxRate}%`,
      '',
      'Jordan 401(k): $80k pre-tax, 8% + 3% employer on $100k',
      'Alex: $40k + $6k/yr — Roth IRA (S1) or Traditional IRA (S2)',
      `Total monthly savings (both): $${Math.round(mixed.synced.monthlyContributions)}/mo`,
      '',
      'Scenario 1 — Jordan pre-tax + Alex Roth:',
      `  Nominal FV: $${mixed.projection.projectedNominal.toLocaleString()}`,
      `  Gross-equiv FV: $${mixed.projection.projectedGrossEquivalent.toLocaleString()}`,
      `  Bucket readiness: ${mixedReadiness}%`,
      `  Freedom readiness: ${mixed.plan.projectedReadinessPercent}%`,
      '',
      'Scenario 2 — both pre-tax:',
      `  Nominal FV: $${allPreTax.projection.projectedNominal.toLocaleString()}`,
      `  Gross-equiv FV: $${allPreTax.projection.projectedGrossEquivalent.toLocaleString()}`,
      `  Bucket readiness: ${preTaxReadiness}%`,
      `  Freedom readiness: ${allPreTax.plan.projectedReadinessPercent}%`,
      '',
    ];
    writeFileSync('retirement-partner-roth-progress-output.txt', lines.join('\n'), 'utf8');
  });
});
