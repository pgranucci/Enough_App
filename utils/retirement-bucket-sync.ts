import type { FinancialAccount } from '@/constants/financial-accounts';
import {
  accountPreTaxBalance,
  accountRothBalance,
  accountTotalBalance,
} from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { annualContributionForAccount } from '@/src/core/accounts/contributions';

/** Accounts that can count toward the Retirement bucket. */
export function isRetirementBucketEligibleAccount(account: FinancialAccount): boolean {
  return account.accountType === 'retirement' || account.accountType === 'brokerage';
}

/**
 * Accounts included in Retirement bucket math.
 * Only explicitly assigned retirement or brokerage accounts count; none assigned → empty.
 */
export function accountsForRetirementBucket(
  allAccounts: FinancialAccount[],
  assignedIds?: string[] | null
): FinancialAccount[] {
  if (!Array.isArray(assignedIds) || assignedIds.length === 0) {
    return [];
  }
  const idSet = new Set(assignedIds);
  return allAccounts.filter(
    (account) => isRetirementBucketEligibleAccount(account) && idSet.has(account.id)
  );
}

/**
 * Roll assigned accounts into balances and contributions for bucket display and projections.
 * Does not change `expectedAnnualReturn` — portfolio needed uses Profile → Assumptions only.
 */
export function syncRetirementFromBucketAccounts(
  accounts: FinancialAccount[],
  profile: ProfileInputs
): Pick<RetirementInputs, 'traditionalBalance' | 'rothBalance' | 'monthlyContributions'> {
  let traditionalBalance = 0;
  let rothBalance = 0;
  let monthlyContributions = 0;

  for (const account of accounts) {
    if (account.accountType === 'retirement') {
      traditionalBalance += accountPreTaxBalance(account);
      rothBalance += accountRothBalance(account);
    } else if (account.accountType === 'brokerage') {
      traditionalBalance += accountTotalBalance(account);
    }

    monthlyContributions += annualContributionForAccount(account, profile) / 12;
  }

  return {
    traditionalBalance,
    rothBalance,
    monthlyContributions,
  };
}

/** Apply income replacement and bucket account selection before building the Retirement bucket. */
export function retirementInputsForBucket(
  retirement: RetirementInputs,
  profile: ProfileInputs,
  householdGrossAnnual: number,
  assignedAccountIds?: string[] | null
): RetirementInputs {
  const accounts = accountsForRetirementBucket(retirement.accounts, assignedAccountIds);
  const synced = syncRetirementFromBucketAccounts(accounts, profile);
  return { ...retirement, ...synced, accounts };
}
