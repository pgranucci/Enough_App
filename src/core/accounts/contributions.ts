import type { FinancialAccount } from '@/constants/financial-accounts';
import {
  getHouseholdAnnualIncome,
  getPartnerAnnualIncome,
  type ProfileInputs,
} from '@/constants/profile';

export type AccountContributionBreakdown = {
  employeeAnnual: number;
  employerAnnual: number;
  totalAnnual: number;
};

export function grossIncomeForAccountOwner(
  profile: ProfileInputs,
  owner: FinancialAccount['accountOwner'] = 'self'
): number {
  if (profile.planningMode === 'partner' && owner === 'partner') {
    return getPartnerAnnualIncome(profile);
  }
  return Math.max(profile.annualIncome, 0);
}

export function accountContributionBreakdown(
  account: FinancialAccount,
  profile: ProfileInputs
): AccountContributionBreakdown {
  if (account.accountType !== 'retirement') {
    const savings = Math.max(account.estimatedAnnualSavings, 0);
    return { employeeAnnual: savings, employerAnnual: 0, totalAnnual: savings };
  }

  if (account.isEmployerPlan) {
    const salaryBase = grossIncomeForAccountOwner(profile, account.accountOwner);
    const employeePercent =
      account.employeePreTaxContributionPercent + account.employeeRothContributionPercent;
    const employerPercent =
      account.employerMatchPercent + account.employerProfitSharingPercent;
    const employeeAnnual =
      employeePercent > 0 && salaryBase > 0 ? (salaryBase * employeePercent) / 100 : 0;
    const employerAnnual =
      employerPercent > 0 && salaryBase > 0 ? (salaryBase * employerPercent) / 100 : 0;
    const fromPercents = employeeAnnual + employerAnnual;
    if (fromPercents > 0) {
      return { employeeAnnual, employerAnnual, totalAnnual: fromPercents };
    }
    const dollars = Math.max(account.annualContributionDollars, 0);
    return { employeeAnnual: dollars, employerAnnual: 0, totalAnnual: dollars };
  }

  const dollars = Math.max(account.annualContributionDollars, 0);
  return { employeeAnnual: dollars, employerAnnual: 0, totalAnnual: dollars };
}

export function annualContributionForAccount(
  account: FinancialAccount,
  profile: ProfileInputs
): number {
  return accountContributionBreakdown(account, profile).totalAnnual;
}
