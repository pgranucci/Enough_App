import {
  type BucketItem,
  usesAssignedAccountGoalBucket,
} from '@/constants/buckets';
import {
  accountTotalBalance,
  type FinancialAccount,
} from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { shortTermGrowthRate } from '@/constants/retirement';

import { annualContributionForAccount } from '@/src/core/accounts/contributions';
import {
  effectiveAssignedAccountGrowthPercent,
  investmentMixReturnPercent,
} from '@/src/core/growth/returns';
import { addMonthsToIso } from '@/src/core/shared/dates';
import {
  COMPLETION_SEARCH_MAX_MONTHS,
  futureValueNominal,
  monthsUntilBalanceReachesTarget,
} from '@/src/core/shared/projection';

type AccountProjectionRow = {
  balance: number;
  monthlyContribution: number;
  annualGrowthPercent: number;
  annualNominalGrowthPercent: number;
};

function mixForAccount(account: FinancialAccount) {
  return account.investmentMix ?? (account.accountType === 'savings' ? 'cash' : 'balanced');
}

/**
 * Emergency/slush: short-term cash uses nominal 0% (not negative real). Invested mixes use real return
 * so completion can run on balance growth alone when the user has no annual savings on the account.
 */
function cashReserveProjectionGrowthPercent(
  account: FinancialAccount,
  retirement: Pick<
    RetirementInputs,
    'investmentGrowthMode' | 'customInvestmentGrowthRates' | 'inflationAssumption'
  >
): number {
  const mix = mixForAccount(account);
  if (account.accountType === 'savings' && mix === 'cash') {
    return investmentMixReturnPercent(mix, retirement);
  }
  return effectiveAssignedAccountGrowthPercent(account, retirement);
}

function projectionGrowthPercentForBucket(
  account: FinancialAccount,
  retirement: Pick<
    RetirementInputs,
    'investmentGrowthMode' | 'customInvestmentGrowthRates' | 'inflationAssumption'
  >,
  bucketId: string
): number {
  if (usesAssignedAccountGoalBucket(bucketId)) {
    return cashReserveProjectionGrowthPercent(account, retirement);
  }
  return effectiveAssignedAccountGrowthPercent(account, retirement);
}

function buildAccountRows(
  accounts: FinancialAccount[],
  profile: ProfileInputs,
  retirement: Pick<
    RetirementInputs,
    'investmentGrowthMode' | 'customInvestmentGrowthRates' | 'inflationAssumption'
  >,
  bucketId: string
): AccountProjectionRow[] {
  return accounts.map((account) => {
    const mix = mixForAccount(account);
    return {
      balance: accountTotalBalance(account),
      monthlyContribution: annualContributionForAccount(account, profile) / 12,
      annualGrowthPercent: projectionGrowthPercentForBucket(account, retirement, bucketId),
      annualNominalGrowthPercent: investmentMixReturnPercent(mix, retirement),
    };
  });
}

function balanceWeightedNominalGrowthPercent(rows: AccountProjectionRow[]): number {
  let weighted = 0;
  let total = 0;

  for (const row of rows) {
    if (row.balance > 0) {
      weighted += row.balance * row.annualNominalGrowthPercent;
      total += row.balance;
    }
  }
  if (total > 0) return weighted / total;

  for (const row of rows) {
    if (row.monthlyContribution > 0) {
      weighted += row.monthlyContribution * row.annualNominalGrowthPercent;
      total += row.monthlyContribution;
    }
  }
  if (total > 0) return weighted / total;

  return shortTermGrowthRate();
}

function balanceWeightedProjectionGrowthPercent(rows: AccountProjectionRow[]): number {
  let weighted = 0;
  let total = 0;

  for (const row of rows) {
    if (row.balance > 0) {
      weighted += row.balance * row.annualGrowthPercent;
      total += row.balance;
    }
  }
  if (total > 0) return weighted / total;

  for (const row of rows) {
    if (row.monthlyContribution > 0) {
      weighted += row.monthlyContribution * row.annualGrowthPercent;
      total += row.monthlyContribution;
    }
  }
  if (total > 0) return weighted / total;

  return rows[0]?.annualGrowthPercent ?? shortTermGrowthRate();
}

function monthsUntilAssignedAccountsReachTarget(
  targetToday: number,
  rows: AccountProjectionRow[]
): number | null {
  const currentTotal = rows.reduce((sum, row) => sum + row.balance, 0);
  if (currentTotal >= targetToday) return 0;

  const monthlyTotal = rows.reduce((sum, row) => sum + row.monthlyContribution, 0);
  const growth = balanceWeightedProjectionGrowthPercent(rows) / 100;
  if (monthlyTotal <= 0 && growth <= 0) return null;

  return monthsUntilBalanceReachesTarget(
    targetToday,
    currentTotal,
    monthlyTotal,
    growth
  );
}

export function applyAssignedAccountsToBucket(
  bucket: BucketItem,
  accounts: FinancialAccount[],
  retirement: RetirementInputs,
  profile: ProfileInputs
): BucketItem {
  if (accounts.length === 0) return bucket;

  const rows = buildAccountRows(accounts, profile, retirement, bucket.id);
  const current = Math.round(rows.reduce((sum, row) => sum + row.balance, 0));
  const monthlyContribution = Math.round(
    rows.reduce((sum, row) => sum + row.monthlyContribution, 0)
  );
  const annualGrowthRate = balanceWeightedNominalGrowthPercent(rows);
  const annualInflationRate = usesAssignedAccountGoalBucket(bucket.id)
    ? retirement.inflationAssumption
    : bucket.annualInflationRate ?? retirement.inflationAssumption;

  const completionMonths = monthsUntilAssignedAccountsReachTarget(bucket.target, rows);
  const yearsUntilTarget = completionMonths != null ? completionMonths / 12 : 0;

  const monthlyTotal = rows.reduce((sum, row) => sum + row.monthlyContribution, 0);
  const projectionGrowth = balanceWeightedProjectionGrowthPercent(rows) / 100;
  const projectionHorizonMonths = completionMonths ?? COMPLETION_SEARCH_MAX_MONTHS;
  const projectedFutureValue = Math.round(
    futureValueNominal(current, monthlyTotal, projectionGrowth, projectionHorizonMonths)
  );

  return {
    ...bucket,
    current,
    monthlyContribution,
    annualGrowthRate,
    annualInflationRate,
    yearsUntilTarget,
    projectedFutureValue,
    projectedFutureValueReal: projectedFutureValue,
    inflationAdjustedTarget: undefined,
    estimatedCompletionDate:
      completionMonths != null ? addMonthsToIso(completionMonths) : null,
  };
}
