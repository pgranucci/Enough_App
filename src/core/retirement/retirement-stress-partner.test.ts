/**
 * End-to-end stress test: two spouses, staggered retirements, pre-tax/Roth mix,
 * pension + dual Social Security + timed other-income streams, four assigned accounts.
 */
import { describe, expect, it } from 'vitest';

import { buildRetirementBucket } from '@/constants/buckets';
import { getHouseholdAnnualIncome } from '@/constants/profile';
import { annualHouseholdOtherIncomeAtRetirement } from '@/utils/retirement-other-income';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { calculateRetirementPlan, retirementFundingYears } from '@/utils/retirement-planning';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import {
  accountsForRetirementBucket,
  retirementInputsForBucket,
  syncRetirementFromBucketAccounts,
} from '@/utils/retirement-bucket-sync';

import { fixtureComplexPartnerHousehold } from '@/src/core/retirement/fixtures-complex-partner';

/** Locked outputs for this stress fixture — update only when retirement logic intentionally changes. */
const COMPLEX_PARTNER_STRESS_GOLDEN = {
  requiredPortfolioTarget: 998_942,
  nominalPortfolioToday: 455_000,
  projectedReadinessPercent: 100,
} as const;

describe('retirement stress: complex partner household', () => {
  const fixture = fixtureComplexPartnerHousehold();
  const householdGross = getHouseholdAnnualIncome(fixture.profile);
  const retirement = applyIncomeReplacementToRetirement(fixture.retirement, householdGross);
  const assignedIds = fixture.accounts.map((a) => a.id);
  const inputsForBucket = retirementInputsForBucket(
    retirement,
    fixture.profile,
    householdGross,
    assignedIds
  );
  const plan = calculateRetirementPlan(inputsForBucket, fixture.profile);
  const projection = projectGrossEquivalentPortfolioAtRetirement(
    accountsForRetirementBucket(fixture.accounts, assignedIds),
    inputsForBucket,
    fixture.profile,
    plan.effectiveRetirementTaxRatePercentAtRetirement
  );
  const bucket = buildRetirementBucket(inputsForBucket, fixture.profile);

  it('household setup reflects two earners and staggered retirement ages', () => {
    expect(householdGross).toBe(205_000);
    expect(retirement.desiredAnnualGrossIncome).toBe(153_750);
    expect(retirement.retirementAge).toBe(62);
    expect(retirement.partnerRetirementAge).toBe(64);
    expect(fixture.profile.planningMode).toBe('partner');
  });

  it('funds withdrawals over the longer partner survival horizon (30 years)', () => {
    expect(retirementFundingYears(retirement, fixture.profile)).toBe(30);
    expect(plan.retirementFundingYears).toBe(30);
  });

  it('includes other income timed to each spouse’s retirement age', () => {
    expect(
      annualHouseholdOtherIncomeAtRetirement(retirement.otherIncomeStreams, 62, 63)
    ).toBe(18_000);

    expect(
      annualHouseholdOtherIncomeAtRetirement(retirement.otherIncomeStreams, 62, 64)
    ).toBe(42_000);
  });

  it('rolls four accounts into pre-tax, Roth, and contribution totals', () => {
    const synced = syncRetirementFromBucketAccounts(
      accountsForRetirementBucket(fixture.accounts, assignedIds),
      fixture.profile
    );
    expect(synced.traditionalBalance).toBe(355_000);
    expect(synced.rothBalance).toBe(100_000);
    expect(synced.monthlyContributions).toBeGreaterThan(2_400);
    expect(inputsForBucket.traditionalBalance).toBe(synced.traditionalBalance);
    expect(inputsForBucket.rothBalance).toBe(synced.rothBalance);
  });

  it('reduces the portfolio gap using SS, partner SS, pension, and other income', () => {
    expect(plan.inflatedSocialSecurity).toBe(28_000);
    expect(plan.inflatedPartnerSocialSecurity).toBe(22_000);
    expect(plan.inflatedPension).toBe(12_000);
    expect(plan.inflatedOtherIncome).toBe(42_000);
    expect(plan.desiredAnnualNetIncomeTarget).toBeGreaterThan(0);
    expect(plan.retirementIncomeGap).toBeGreaterThan(0);
    expect(plan.retirementIncomeGap).toBeLessThan(plan.desiredAnnualNetIncomeTarget);
  });

  it('required portfolio matches year-by-year schedule PV', () => {
    const schedule = buildRetirementYearSchedule(inputsForBucket, fixture.profile);
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));
    expect(plan.requiredPortfolioTarget).toBeGreaterThan(500_000);
  });

  it('projects material growth from today to retirement across account types', () => {
    expect(plan.nominalPortfolioTotal).toBe(455_000);
    expect(plan.futureValueInvestments).toBeGreaterThan(plan.nominalPortfolioTotal);
    expect(plan.futureGrossEquivalentPortfolio).toBeGreaterThan(plan.currentPortfolioGrossEquivalent);
    expect(projection.projectedNominal).toBeGreaterThan(1_000_000);
    expect(projection.monthlyContributionEmployer).toBeGreaterThan(0);
    expect(projection.monthlyContributionEmployee).toBeGreaterThan(0);
  });

  it('successful outcome: strong readiness (this fixture reaches 100% funded)', () => {
    expect(plan).toMatchObject({
      requiredPortfolioTarget: COMPLEX_PARTNER_STRESS_GOLDEN.requiredPortfolioTarget,
      nominalPortfolioTotal: COMPLEX_PARTNER_STRESS_GOLDEN.nominalPortfolioToday,
      projectedReadinessPercent: COMPLEX_PARTNER_STRESS_GOLDEN.projectedReadinessPercent,
    });
    expect(plan.projectedReadinessPercent).toBe(100);
    expect(plan.futureGrossEquivalentPortfolio).toBeGreaterThanOrEqual(
      plan.requiredPortfolioTarget
    );
    expect(bucket.readinessProgress).toBe(1);
    expect(bucket.target).toBe(plan.requiredPortfolioTarget);
    expect(bucket.estimatedCompletionDate).toBeNull();
  });

  it('bucket UI uses per-account projection; plan uses aggregate balance split', () => {
    expect(bucket.current).toBe(plan.currentPortfolioGrossEquivalent);
    expect(bucket.projectedPortfolioAtRetirement).toBe(projection.projectedNominal);
    expect(bucket.target).toBe(plan.requiredPortfolioTarget);
    expect(projection.projectedGrossEquivalent).toBeGreaterThanOrEqual(
      plan.requiredPortfolioTarget
    );
    expect(plan.futureGrossEquivalentPortfolio).toBeGreaterThanOrEqual(
      plan.requiredPortfolioTarget
    );
    expect(bucket.readinessProgress).toBe(1);
  });
});
