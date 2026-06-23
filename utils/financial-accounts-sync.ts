import type { FinancialAccount } from '@/constants/financial-accounts';
import {
  accountPreTaxBalance,
  accountRothBalance,
} from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';

import {
  accountContributionBreakdown,
  annualContributionForAccount,
  grossIncomeForAccountOwner,
  type AccountContributionBreakdown,
} from '@/src/core/accounts/contributions';

export type { AccountContributionBreakdown };
export {
  accountContributionBreakdown,
  annualContributionForAccount,
  grossIncomeForAccountOwner,
};

/** @deprecated Use {@link grossIncomeForAccountOwner} per account. */
export function salaryBaseForRetirementContributions(profile: ProfileInputs): number {
  return grossIncomeForAccountOwner(profile, 'self');
}

/** Map account list into legacy retirement fields used by Freedom projections. */
export function syncRetirementFromAccounts(
  accounts: FinancialAccount[],
  profile: ProfileInputs,
  base: RetirementInputs
): Partial<RetirementInputs> {
  let traditionalBalance = 0;
  let rothBalance = 0;
  let monthlyContributions = 0;

  for (const account of accounts) {
    if (account.accountType === 'retirement') {
      traditionalBalance += accountPreTaxBalance(account);
      rothBalance += accountRothBalance(account);
      monthlyContributions += annualContributionForAccount(account, profile) / 12;
    }
  }

  return {
    accounts,
    traditionalBalance,
    rothBalance,
    monthlyContributions,
    // Keep expected annual return as a manual assumptions input only.
    expectedAnnualReturn: base.expectedAnnualReturn,
  };
}
