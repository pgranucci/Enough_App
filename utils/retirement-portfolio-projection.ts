import {
  accountPreTaxBalance,
  accountRothBalance,
  accountTotalBalance,
  type FinancialAccount,
} from '@/constants/financial-accounts';
import type { RetirementInputs } from '@/constants/retirement';
import type { ProfileInputs } from '@/constants/profile';
import { accountContributionBreakdown } from '@/src/core/accounts/contributions';
import { realInvestmentMixReturnPercent } from '@/src/core/growth/returns';
import { simulateRetirement } from '@/src/core/retirement/engine';
import { futureValueNominal } from '@/src/core/shared/projection';
import { isRetirementBucketEligibleAccount } from '@/utils/retirement-bucket-sync';
import { isValidDateOfBirth, monthsUntilRetirementAge } from '@/utils/profile-age';
import { portfolioGrossWithdrawalCapacity } from '@/utils/retirement-planning';
import { clamp } from '@/utils/numbers';

type ProjectionInputs = Pick<
  RetirementInputs,
  | 'currentAge'
  | 'retirementAge'
  | 'investmentGrowthMode'
  | 'customInvestmentGrowthRates'
  | 'traditionalBalance'
  | 'rothBalance'
  | 'monthlyContributions'
  | 'expectedAnnualReturn'
  | 'inflationAssumption'
>;

function realAnnualGrowthForAccount(
  account: FinancialAccount,
  inputs: ProjectionInputs
): number {
  const mix = mixForAccount(account);
  const realPercent = realInvestmentMixReturnPercent(mix, inputs);
  return realPercent / 100;
}

function monthsUntilRetirement(inputs: ProjectionInputs, profile: ProfileInputs): number {
  if (isValidDateOfBirth(profile.dateOfBirth)) {
    return monthsUntilRetirementAge(profile.dateOfBirth, inputs.retirementAge);
  }
  return Math.max(Math.round((inputs.retirementAge - inputs.currentAge) * 12), 0);
}

function mixForAccount(account: FinancialAccount) {
  return account.investmentMix ?? (account.accountType === 'savings' ? 'cash' : 'balanced');
}

function accountBalancesForProjection(account: FinancialAccount): { preTax: number; roth: number } {
  const preTax = accountPreTaxBalance(account);
  const roth = accountRothBalance(account);
  if (account.accountType === 'retirement' && account.isEmployerPlan && preTax + roth <= 0) {
    const legacy = Math.max(account.currentValue, 0);
    return { preTax: legacy, roth: 0 };
  }
  return { preTax, roth };
}

function defaultPreTaxContributionShare(
  account: FinancialAccount,
  balances: { preTax: number; roth: number }
): number {
  if (account.accountType !== 'retirement') return 1;

  if (!account.isEmployerPlan) {
    return account.isRoth ? 0 : 1;
  }

  const employeeTotal =
    Math.max(account.employeePreTaxContributionPercent, 0) +
    Math.max(account.employeeRothContributionPercent, 0);
  if (employeeTotal > 0) {
    return Math.max(account.employeePreTaxContributionPercent, 0) / employeeTotal;
  }

  const totalBalance = balances.preTax + balances.roth;
  if (totalBalance > 0) {
    return balances.preTax / totalBalance;
  }

  return 1;
}

export type RetirementProjectionTotals = {
  projectedNominal: number;
  projectedGrossEquivalent: number;
  monthlyContributionTotal: number;
  monthlyContributionEmployee: number;
  monthlyContributionEmployer: number;
  weightedAnnualReturnPercent: number;
};

function rothToPreTaxEquivalent(balance: number, preTaxWithdrawalTaxRatePercent: number): number {
  const roth = Math.max(balance, 0);
  const taxRate = clamp(preTaxWithdrawalTaxRatePercent / 100, 0, 0.6);
  if (roth <= 0 || taxRate <= 0) return roth;
  if (taxRate >= 1) return roth;
  return roth / (1 - taxRate);
}

/** Project pre-tax + Roth gross-equivalent at retirement age in today's dollars (real return). */
export function projectGrossEquivalentPortfolioAtRetirement(
  accounts: FinancialAccount[],
  inputs: ProjectionInputs,
  profile: ProfileInputs,
  preTaxWithdrawalTaxRatePercent = 0
): RetirementProjectionTotals {
  const months = monthsUntilRetirement(inputs, profile);
  const eligible = accounts.filter(isRetirementBucketEligibleAccount);

  if (eligible.length === 0) {
    const total = inputs.traditionalBalance + inputs.rothBalance;
    const traditionalShare = total > 0 ? inputs.traditionalBalance / total : 0.5;
    const projectionBase = {
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      monthsUntilRetirement: months,
      nominalAnnualReturnPercent: inputs.expectedAnnualReturn,
      inflationAssumptionPercent: inputs.inflationAssumption,
    };
    const fvTraditional = simulateRetirement({
      ...projectionBase,
      balanceToday: inputs.traditionalBalance,
      monthlyContribution: inputs.monthlyContributions * traditionalShare,
    }).projectedBalanceAtRetirement;
    const fvRoth = simulateRetirement({
      ...projectionBase,
      balanceToday: inputs.rothBalance,
      monthlyContribution: inputs.monthlyContributions * (1 - traditionalShare),
    }).projectedBalanceAtRetirement;
    const rothGrossEquivalent = rothToPreTaxEquivalent(fvRoth, preTaxWithdrawalTaxRatePercent);
    const projectedNominal = fvTraditional + fvRoth;
    return {
      projectedNominal: Math.round(projectedNominal),
      projectedGrossEquivalent: Math.round(
        portfolioGrossWithdrawalCapacity(fvTraditional, rothGrossEquivalent)
      ),
      monthlyContributionTotal: inputs.monthlyContributions,
      monthlyContributionEmployee: inputs.monthlyContributions,
      monthlyContributionEmployer: 0,
      weightedAnnualReturnPercent: inputs.expectedAnnualReturn,
    };
  }

  let fvTraditional = 0;
  let fvRoth = 0;
  let monthlyEmployee = 0;
  let monthlyEmployer = 0;
  let weightedReturn = 0;
  let weightedBalance = 0;

  for (const account of eligible) {
    const growth = realAnnualGrowthForAccount(account, inputs);
    const growthPercent = growth * 100;
    const breakdown = accountContributionBreakdown(account, profile);
    const monthlyContribution = breakdown.totalAnnual / 12;
    monthlyEmployee += breakdown.employeeAnnual / 12;
    monthlyEmployer += breakdown.employerAnnual / 12;

    const balanceForWeight = accountTotalBalance(account);
    if (balanceForWeight > 0) {
      weightedReturn += balanceForWeight * growthPercent;
      weightedBalance += balanceForWeight;
    }

    if (account.accountType === 'brokerage') {
      const balance = accountTotalBalance(account);
      fvTraditional += futureValueNominal(balance, monthlyContribution, growth, months);
      continue;
    }

    const { preTax, roth } = accountBalancesForProjection(account);
    const total = preTax + roth;
    const preTaxShare =
      total > 0 ? preTax / total : defaultPreTaxContributionShare(account, { preTax, roth });

    fvTraditional += futureValueNominal(
      preTax,
      monthlyContribution * preTaxShare,
      growth,
      months
    );
    fvRoth += futureValueNominal(
      roth,
      monthlyContribution * (1 - preTaxShare),
      growth,
      months
    );
  }

  const monthlyTotal = monthlyEmployee + monthlyEmployer;
  const rothGrossEquivalent = rothToPreTaxEquivalent(fvRoth, preTaxWithdrawalTaxRatePercent);
  const projectedNominal = fvTraditional + fvRoth;

  return {
    projectedNominal: Math.round(projectedNominal),
    projectedGrossEquivalent: Math.round(
      portfolioGrossWithdrawalCapacity(fvTraditional, rothGrossEquivalent)
    ),
    monthlyContributionTotal: monthlyTotal,
    monthlyContributionEmployee: monthlyEmployee,
    monthlyContributionEmployer: monthlyEmployer,
    weightedAnnualReturnPercent:
      weightedBalance > 0 ? weightedReturn / weightedBalance : inputs.expectedAnnualReturn,
  };
}
