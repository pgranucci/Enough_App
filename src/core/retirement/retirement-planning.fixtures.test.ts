import { describe, expect, it } from 'vitest';

import { buildRetirementBucket } from '@/constants/buckets';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { grossToNetRetirementIncome, preTaxWithdrawalTaxRatePercent } from '@/utils/retirement-income-tax';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import { retirementInputsForBucket, syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';

import {
  fixtureBrokerageAccount,
  fixtureEmployer401kAccount,
  fixtureSoloTexasAccumulation,
  fixtureSocialSecurityCoversGoal,
  makeProfile,
  makeRetirement,
} from '@/src/core/retirement/fixtures';

/** Locked outputs from calculateRetirementPlan (TX, 7.5% / 2.5%). Update only when logic intentionally changes. */
const SOLO_TEXAS_PLAN = {
  yearsUntilRetirement: 25,
  rothGrossEquivalentToday: 56_497,
  currentPortfolioGrossEquivalent: 150_000,
  futureValueInvestments: 1_084_070,
  futureGrossEquivalentPortfolio: 1_131_026,
  desiredAnnualNetIncomeTarget: 70_786,
  annualGrossWithdrawalFromPortfolio: 74_726,
  retirementIncomeGap: 70_786,
  requiredPortfolioTarget: 1_239_595,
  realReturnInRetirementPercent: 4.88,
  retirementFundingYears: 30,
  projectedReadinessPercent: 91,
} as const;

const SS_COVERS_PLAN = {
  yearsUntilRetirement: 30,
  requiredPortfolioTarget: 0,
  retirementIncomeGap: 0,
  annualGrossWithdrawalFromPortfolio: 0,
  projectedReadinessPercent: 100,
  desiredAnnualNetIncomeTarget: 37_239,
} as const;

describe('calculateRetirementPlan fixtures', () => {
  it('solo TX accumulation matches locked fixture', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const plan = calculateRetirementPlan(retirement, profile);
    expect(plan).toMatchObject(SOLO_TEXAS_PLAN);
  });

  it('required portfolio matches year-by-year schedule PV', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const plan = calculateRetirementPlan(retirement, profile);
    const schedule = buildRetirementYearSchedule(retirement, profile);
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));
  });

  it('gross withdrawal funds the net income gap with Roth-aware gross-up', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const plan = calculateRetirementPlan(retirement, profile);
    const schedule = buildRetirementYearSchedule(retirement, profile);
    expect(plan.annualGrossWithdrawalFromPortfolio).toBe(Math.round(schedule.firstYearGrossWithdrawal));
    expect(plan.annualGrossWithdrawalFromPortfolio).toBe(74_726);
  });

  it('readiness is projected gross-equivalent ÷ required portfolio (capped at 100)', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const plan = calculateRetirementPlan(retirement, profile);
    const readiness = Math.min(
      100,
      Math.round((plan.futureGrossEquivalentPortfolio / plan.requiredPortfolioTarget) * 100)
    );
    expect(plan.projectedReadinessPercent).toBe(readiness);
  });

  it('when Social Security covers the net goal, required portfolio is zero', () => {
    const { retirement, profile } = fixtureSocialSecurityCoversGoal();
    const plan = calculateRetirementPlan(retirement, profile);
    expect(plan).toMatchObject(SS_COVERS_PLAN);
    expect(plan.inflatedSocialSecurity).toBe(50_000);
    expect(grossToNetRetirementIncome(50_000, retirement)).toBeGreaterThan(
      plan.desiredAnnualNetIncomeTarget
    );
  });

  it('uses date of birth for years until retirement when valid', () => {
    const retirement = makeRetirement({ retirementAge: 65, currentAge: 99 });
    const profile = makeProfile({ dateOfBirth: '1990-06-15' });
    const plan = calculateRetirementPlan(retirement, profile);
    expect(plan.yearsUntilRetirement).toBeGreaterThan(0);
    expect(plan.yearsUntilRetirement).toBeLessThan(40);
  });
});

describe('projectGrossEquivalentPortfolioAtRetirement fixtures', () => {
  it('projects employer 401(k) with employee + employer contributions', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account = fixtureEmployer401kAccount();
    const synced = syncRetirementFromBucketAccounts([account], profile);
    const inputs = { ...retirement, ...synced, accounts: [account] };
    const plan = calculateRetirementPlan(inputs, profile);

    const projection = projectGrossEquivalentPortfolioAtRetirement(
      [account],
      inputs,
      profile,
      plan.effectiveRetirementTaxRatePercentAtRetirement
    );

    expect(projection.projectedNominal).toBe(1_078_724);
    expect(projection.projectedGrossEquivalent).toBe(plan.futureGrossEquivalentPortfolio);
    expect(projection.monthlyContributionTotal).toBeCloseTo(synced.monthlyContributions, 1);
    expect(projection.monthlyContributionEmployee).toBeCloseTo(475, 1);
    expect(projection.monthlyContributionEmployer).toBeCloseTo(237.5, 1);
    expect(projection.weightedAnnualReturnPercent).toBeCloseTo(4.878, 2);
  });

  it('falls back to aggregate balances when no eligible accounts are passed', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const projection = projectGrossEquivalentPortfolioAtRetirement([], retirement, profile, 15);
    expect(projection.monthlyContributionTotal).toBe(retirement.monthlyContributions);
    expect(projection.projectedNominal).toBeGreaterThan(0);
  });
});

describe('retirement bucket sync fixtures', () => {
  it('syncs assigned 401(k) balances and monthly contributions', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account = fixtureEmployer401kAccount();
    const synced = syncRetirementFromBucketAccounts([account], profile);

    expect(synced.traditionalBalance).toBe(150_000);
    expect(synced.rothBalance).toBe(50_000);
    expect(synced.monthlyContributions).toBeCloseTo(712.5, 1);
  });

  it('buildRetirementBucket ties plan target to account-level projection', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account = fixtureEmployer401kAccount();
    const inputs = {
      ...retirement,
      accounts: [account],
      traditionalBalance: 150_000,
      rothBalance: 50_000,
    };

    const bucket = buildRetirementBucket(inputs, profile);
    const plan = calculateRetirementPlan(inputs, profile);

    expect(bucket.target).toBe(plan.requiredPortfolioTarget);
    expect(bucket.current).toBe(200_000);
    expect(bucket.projectedPortfolioAtRetirement).toBe(1_078_724);
    expect(bucket.readinessProgress).toBeCloseTo(0.889, 2);
    expect(bucket.annualContributions).toBe(8_550);
  });

  it('retirementInputsForBucket only includes explicitly assigned accounts', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account = fixtureEmployer401kAccount();
    const withAccounts = { ...retirement, accounts: [account] };

    const none = retirementInputsForBucket(withAccounts, profile, 0, []);
    expect(none.traditionalBalance).toBe(0);
    expect(none.monthlyContributions).toBe(0);

    const assigned = retirementInputsForBucket(withAccounts, profile, 0, [account.id]);
    expect(assigned.traditionalBalance).toBe(150_000);
    expect(assigned.monthlyContributions).toBeGreaterThan(0);
  });

  it('uses only assigned retirement-goal accounts and projects from synced balances/contributions', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account401k = fixtureEmployer401kAccount();
    const brokerage = fixtureBrokerageAccount();
    const withAccounts = { ...retirement, accounts: [account401k, brokerage] };
    const assignedIds = [account401k.id, brokerage.id];

    const assignedInputs = retirementInputsForBucket(withAccounts, profile, 0, assignedIds);
    const plan = calculateRetirementPlan(assignedInputs, profile);

    expect(assignedInputs.traditionalBalance).toBe(225_000);
    expect(assignedInputs.rothBalance).toBe(50_000);
    expect(assignedInputs.monthlyContributions).toBeCloseTo(1_212.5, 1);

    // Freedom tab displays this value as "Projected Retirement Balance".
    expect(plan.futureGrossEquivalentPortfolio).toBeGreaterThan(0);
  });
});

describe('Freedom estimated retirement need', () => {
  it('equals schedule PV (requiredPortfolioTarget) on assignment-aware Freedom inputs', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account401k = fixtureEmployer401kAccount();
    const brokerage = fixtureBrokerageAccount();
    const withAccounts = { ...retirement, accounts: [account401k, brokerage] };
    const assignedInputs = retirementInputsForBucket(withAccounts, profile, 0, [
      account401k.id,
      brokerage.id,
    ]);

    const plan = calculateRetirementPlan(assignedInputs, profile);
    const schedule = buildRetirementYearSchedule(assignedInputs, profile);

    // Freedom tab: estimatedRetirementNeed={plan.requiredPortfolioTarget}
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));
    expect(plan.requiredPortfolioTarget).toBe(1_264_571);
  });

  it('differs from raw retirement inputs when bucket assignment changes Roth mix', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const rawPlan = calculateRetirementPlan(retirement, profile);

    const account401k = fixtureEmployer401kAccount();
    const assignedInputs = retirementInputsForBucket(
      { ...retirement, accounts: [account401k] },
      profile,
      0,
      [account401k.id]
    );
    const assignedPlan = calculateRetirementPlan(assignedInputs, profile);

    expect(assignedPlan.requiredPortfolioTarget).not.toBe(rawPlan.requiredPortfolioTarget);
    expect(assignedPlan.requiredPortfolioTarget).toBe(1_253_212);
    expect(rawPlan.requiredPortfolioTarget).toBe(SOLO_TEXAS_PLAN.requiredPortfolioTarget);
  });
});
