import type { FinancialAccount, InvestmentMix } from '@/constants/financial-accounts';
import {
  investmentGrowthRateForMix,
  type InvestmentGrowthPreset,
  type RetirementInputs,
} from '@/constants/retirement';

import { realReturnPercent } from '@/src/core/shared/projection';

type InvestmentAssumptionInputs = Pick<
  RetirementInputs,
  'investmentGrowthMode' | 'customInvestmentGrowthRates' | 'inflationAssumption'
>;

export function investmentMixReturnPercent(
  mix: InvestmentMix,
  inputs: Pick<RetirementInputs, 'investmentGrowthMode' | 'customInvestmentGrowthRates'>
): number {
  if (mix === 'cash') {
    return investmentGrowthRateForMix(
      'shortTerm',
      inputs.investmentGrowthMode,
      inputs.customInvestmentGrowthRates
    );
  }
  if (mix === 'conservative' || mix === 'balanced' || mix === 'aggressive') {
    return investmentGrowthRateForMix(
      mix,
      inputs.investmentGrowthMode,
      inputs.customInvestmentGrowthRates
    );
  }
  return investmentGrowthRateForMix(
    'balanced',
    inputs.investmentGrowthMode,
    inputs.customInvestmentGrowthRates
  );
}

export function realInvestmentMixReturnPercent(
  mix: InvestmentMix,
  inputs: InvestmentAssumptionInputs
): number {
  return realReturnPercent(investmentMixReturnPercent(mix, inputs), inputs.inflationAssumption);
}

function isInvestedAccountType(accountType: FinancialAccount['accountType']): boolean {
  return accountType === 'retirement' || accountType === 'brokerage';
}

export function effectiveAssignedAccountGrowthPercent(
  account: Pick<FinancialAccount, 'accountType' | 'investmentMix'>,
  inputs: InvestmentAssumptionInputs
): number {
  const mix =
    account.investmentMix ?? (account.accountType === 'savings' ? 'cash' : 'balanced');
  if (isInvestedAccountType(account.accountType)) {
    return realInvestmentMixReturnPercent(mix, inputs);
  }
  return investmentMixReturnPercent(mix, inputs);
}

export function resolveInvestmentGrowthRate(
  inputs: Pick<RetirementInputs, 'investmentGrowthMode' | 'customInvestmentGrowthRates'>,
  mix: InvestmentGrowthPreset = 'balanced'
): number {
  return investmentGrowthRateForMix(
    mix,
    inputs.investmentGrowthMode,
    inputs.customInvestmentGrowthRates
  );
}
