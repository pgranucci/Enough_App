import type { BucketItem } from '@/constants/buckets';
import { accountTotalBalance, type FinancialAccount } from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { annualContributionForAccount } from '@/src/core/accounts/contributions';
import { realInvestmentMixReturnPercent } from '@/src/core/growth/returns';
import { realReturnPercent } from '@/src/core/shared/projection';

const RETIREMENT_PACE_START_AGE = 22;
const RETIREMENT_SCORE_FLEX_THRESHOLD = 1.15;
const RETIREMENT_FLEX_CAP_RATIO = 0.25;

function monthlyRateFromAnnual(annualRateDecimal: number): number {
  if (!Number.isFinite(annualRateDecimal)) return 0;
  if (annualRateDecimal <= -1) return -1;
  return Math.pow(1 + annualRateDecimal, 1 / 12) - 1;
}

function futureValueWithMonthlyContribution(
  presentValue: number,
  monthlyContribution: number,
  monthlyRate: number,
  months: number
): number {
  if (months <= 0) return Math.max(presentValue, 0);
  if (Math.abs(monthlyRate) < 1e-9) {
    return Math.max(presentValue + monthlyContribution * months, 0);
  }
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const contributions = monthlyContribution * ((growthFactor - 1) / monthlyRate);
  return Math.max(presentValue * growthFactor + contributions, 0);
}

function solveRequiredMonthlyContribution(
  target: number,
  presentValue: number,
  monthlyRate: number,
  monthsUntilRetirement: number
): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (monthsUntilRetirement <= 0) return presentValue >= target ? 0 : Number.POSITIVE_INFINITY;
  if (presentValue >= target) return 0;

  if (Math.abs(monthlyRate) < 1e-9) {
    return Math.max((target - presentValue) / monthsUntilRetirement, 0);
  }

  const growthFactor = Math.pow(1 + monthlyRate, monthsUntilRetirement);
  const annuityFactor = (growthFactor - 1) / monthlyRate;
  if (Math.abs(annuityFactor) < 1e-9) return Number.POSITIVE_INFINITY;
  return Math.max((target - presentValue * growthFactor) / annuityFactor, 0);
}

function paceLabel(projectedReadinessRatio: number): 'Ahead' | 'On Track' | 'Behind' {
  if (projectedReadinessRatio >= 1) return 'Ahead';
  if (projectedReadinessRatio >= 0.85) return 'On Track';
  return 'Behind';
}

function assignedRetirementAccounts(
  profile: ProfileInputs,
  retirement: RetirementInputs
): FinancialAccount[] {
  const assignedIds = profile.expenses.bucketAssignedAccountIds?.retirement ?? [];
  const idSet = new Set(assignedIds);
  return retirement.accounts.filter((account) => idSet.has(account.id));
}

export function getWeightedRetirementRealReturnPercent(
  accounts: FinancialAccount[],
  retirement: RetirementInputs,
  inflationAssumptionPercent: number = retirement.inflationAssumption,
  profile?: ProfileInputs
): number {
  let weighted = 0;
  let total = 0;

  for (const account of accounts) {
    const balance = accountTotalBalance(account);
    const mix = account.investmentMix ?? (account.accountType === 'savings' ? 'cash' : 'balanced');
    const rate = realInvestmentMixReturnPercent(mix, {
      ...retirement,
      inflationAssumption: inflationAssumptionPercent,
    });
    if (balance > 0) {
      weighted += balance * rate;
      total += balance;
    }
  }

  if (total > 0) return weighted / total;

  if (profile) {
    for (const account of accounts) {
      const contribution = annualContributionForAccount(account, profile);
      const mix = account.investmentMix ?? (account.accountType === 'savings' ? 'cash' : 'balanced');
      const rate = realInvestmentMixReturnPercent(mix, {
        ...retirement,
        inflationAssumption: inflationAssumptionPercent,
      });
      if (contribution > 0) {
        weighted += contribution * rate;
        total += contribution;
      }
    }
  }

  if (total > 0) return weighted / total;
  return realReturnPercent(retirement.expectedAnnualReturn, inflationAssumptionPercent);
}

export type RetirementPaceMetrics = {
  currentRetirementBalance: number;
  expectedBalanceToday: number;
  retirementPaceRatio: number;
  retirementPacePercent: number;
  requiredMonthlyContribution: number;
  currentMonthlyContribution: number;
  contributionProgress: number;
  retirementScore: number;
  paceStatus: 'Ahead' | 'On Track' | 'Behind';
  yearsUntilRetirement: number;
  monthsUntilRetirement: number;
  annualReturnPercentUsed: number;
  annualInflationPercentUsed: number;
  hypotheticalFlexibleAllocation: number;
};

export function calculateRetirementPaceMetrics(params: {
  retirementBucket: BucketItem;
  profile: ProfileInputs;
  retirement: RetirementInputs;
  actualBalanceOverride?: number;
  /** One-time hypothetical lump layered on assigned balances (not persisted). */
  hypotheticalAdditionalBalance?: number;
  hypotheticalAdditionalAnnualSavings?: number;
  annualReturnPercentOverride?: number;
  annualInflationPercentOverride?: number;
}): RetirementPaceMetrics {
  const { retirementBucket, profile, retirement } = params;
  const accounts = assignedRetirementAccounts(profile, retirement);
  const baseBalance = Math.max(
    Math.round(
      params.actualBalanceOverride ??
        accounts.reduce((sum, account) => sum + accountTotalBalance(account), 0)
    ),
    0
  );
  const actualBalance = Math.max(
    baseBalance + Math.max(Math.round(params.hypotheticalAdditionalBalance ?? 0), 0),
    0
  );
  const annualInflationPercentUsed =
    params.annualInflationPercentOverride ?? retirement.inflationAssumption;
  const annualReturnPercentUsed =
    params.annualReturnPercentOverride ??
    getWeightedRetirementRealReturnPercent(accounts, retirement, annualInflationPercentUsed, profile);

  const currentAge = Number.isFinite(retirement.currentAge)
    ? retirement.currentAge
    : profile.userAge;
  const retirementAge = Number.isFinite(retirement.retirementAge)
    ? retirement.retirementAge
    : currentAge;
  const yearsUntilRetirement = Math.max(retirementAge - currentAge, 0);
  const monthsUntilRetirement = Math.max(Math.round(yearsUntilRetirement * 12), 0);

  const annualRateDecimal = annualReturnPercentUsed / 100;
  const monthlyRate = monthlyRateFromAnnual(annualRateDecimal);
  const target = Math.max(retirementBucket.target, 0);

  const requiredMonthlyContribution = solveRequiredMonthlyContribution(
    target,
    actualBalance,
    monthlyRate,
    monthsUntilRetirement
  );

  const elapsedMonths = Math.max(Math.round((currentAge - RETIREMENT_PACE_START_AGE) * 12), 0);
  const expectedBalanceTodayRaw = futureValueWithMonthlyContribution(
    0,
    Number.isFinite(requiredMonthlyContribution) ? requiredMonthlyContribution : 0,
    monthlyRate,
    elapsedMonths
  );
  const expectedBalanceToday = Math.max(Math.round(expectedBalanceTodayRaw), 0);

  const retirementPaceRatio =
    expectedBalanceToday > 0 ? actualBalance / expectedBalanceToday : actualBalance > 0 ? 1 : 0;
  const annualRetirementSavings = accounts.reduce(
    (sum, account) => sum + annualContributionForAccount(account, profile),
    0
  );
  const currentMonthlyContribution = Math.max(Math.round(annualRetirementSavings / 12), 0);
  const contributionProgress =
    requiredMonthlyContribution > 0 && Number.isFinite(requiredMonthlyContribution)
      ? currentMonthlyContribution / requiredMonthlyContribution
      : 1;
  const retirementScore = retirementPaceRatio * 0.7 + contributionProgress * 0.3;
  const projectedReadinessRatio =
    retirementBucket.target > 0 ? retirementBucket.projectedFutureValue / retirementBucket.target : 1;

  const retirementExcessRatio = Math.max(retirementScore - RETIREMENT_SCORE_FLEX_THRESHOLD, 0);
  const hypotheticalFlexibleAllocation =
    retirementExcessRatio > 0
      ? Math.max(Math.round(actualBalance * retirementExcessRatio * RETIREMENT_FLEX_CAP_RATIO), 0)
      : 0;

  return {
    currentRetirementBalance: actualBalance,
    expectedBalanceToday,
    retirementPaceRatio: Math.max(retirementPaceRatio, 0),
    retirementPacePercent: Math.max(Math.round(retirementPaceRatio * 100), 0),
    requiredMonthlyContribution: Number.isFinite(requiredMonthlyContribution)
      ? Math.max(Math.round(requiredMonthlyContribution), 0)
      : 0,
    currentMonthlyContribution,
    contributionProgress: Math.max(contributionProgress, 0),
    retirementScore: Math.max(retirementScore, 0),
    paceStatus: paceLabel(projectedReadinessRatio),
    yearsUntilRetirement,
    monthsUntilRetirement,
    annualReturnPercentUsed,
    annualInflationPercentUsed,
    hypotheticalFlexibleAllocation,
  };
}
