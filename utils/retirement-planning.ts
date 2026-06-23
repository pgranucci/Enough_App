import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { simulateRetirement } from '@/src/core/retirement/engine';
import { realReturnPercent } from '@/src/core/shared/projection';
import { isValidDateOfBirth, monthsUntilRetirementAge } from '@/utils/profile-age';
import {
  annualHouseholdOtherIncomeAtAges,
  buildRetirementYearSchedule,
  retirementFundingYears,
  type RetirementProfileContext,
} from '@/src/core/retirement/year-by-year-income';
export { retirementFundingYears } from '@/src/core/retirement/year-by-year-income';
import { annualContinuingEmploymentGrossAtAges } from '@/src/core/retirement/continuing-employment-income';
import {
  grossToNetRetirementIncome,
  preTaxWithdrawalTaxRatePercent,
} from '@/utils/retirement-income-tax';
import { clamp } from '@/utils/numbers';

/**
 * Present value of level annual withdrawals in today's dollars, discounted at the Fisher real
 * return (expected return in retirement and inflation from Profile → Assumptions).
 */
export function presentValueOfRetirementWithdrawals(
  firstYearAnnualWithdrawal: number,
  yearsInRetirement: number,
  retirementReturnPercent: number,
  inflationPercent: number
): number {
  if (firstYearAnnualWithdrawal <= 0) return 0;

  const n = Math.max(1, Math.round(yearsInRetirement));
  const realRate = realReturnPercent(retirementReturnPercent, inflationPercent) / 100;

  if (Math.abs(realRate) < 1e-8) {
    return firstYearAnnualWithdrawal * n;
  }

  return firstYearAnnualWithdrawal * (1 - Math.pow(1 + realRate, -n)) / realRate;
}

export type RetirementPlanResult = {
  yearsUntilRetirement: number;
  rothGrossEquivalentToday: number;
  currentPortfolioGrossEquivalent: number;
  effectiveRetirementPortfolio: number;
  rothBalanceShareToday: number;
  effectiveRetirementTaxRatePercentToday: number;
  effectiveRetirementTaxRatePercentAtRetirement: number;
  nominalPortfolioTotal: number;
  futureValueInvestments: number;
  futureGrossEquivalentPortfolio: number;
  inflationAdjustedIncomeTarget: number;
  desiredAnnualNetIncomeTarget: number;
  annualGrossWithdrawalFromPortfolio: number;
  inflatedSocialSecurity: number;
  inflatedPension: number;
  inflatedPartTimeIncome: number;
  inflatedOtherIncome: number;
  inflatedContinuingEmployment: number;
  inflatedPartnerSocialSecurity: number;
  retirementIncomeGap: number;
  requiredPortfolioTarget: number;
  realReturnInRetirementPercent: number;
  retirementFundingYears: number;
  projectedReadinessPercent: number;
};

function toTaxRate(percent: number) {
  return clamp(percent / 100, 0, 0.6);
}

/** Share of retirement assets held in Roth (0–1), by nominal pre-tax + Roth balances. */
export function retirementRothBalanceShare(
  traditionalBalance: number,
  rothBalance: number
): number {
  const traditional = Math.max(traditionalBalance, 0);
  const roth = Math.max(rothBalance, 0);
  const total = traditional + roth;
  if (total <= 0) return 0;
  return clamp(roth / total, 0, 1);
}

/**
 * Pre-tax equivalent of Roth balance for display (same net power as gross pre-tax withdrawal).
 */
export function rothToGrossEquivalent(
  rothBalance: number,
  preTaxWithdrawalTaxRatePercent: number
): number {
  if (rothBalance <= 0) return 0;
  const taxRate = toTaxRate(preTaxWithdrawalTaxRatePercent);
  if (taxRate <= 0) return rothBalance;
  if (taxRate >= 1) return rothBalance;
  return rothBalance / (1 - taxRate);
}

/** Gross annual withdrawal capacity from pre-tax + Roth balances (today or at retirement). */
export function portfolioGrossWithdrawalCapacity(
  traditionalBalance: number,
  rothBalance: number
): number {
  return Math.max(traditionalBalance, 0) + Math.max(rothBalance, 0);
}

export type EffectiveRetirementPortfolio = {
  traditionalBalance: number;
  rothBalance: number;
  rothGrossEquivalent: number;
  nominalTotal: number;
  totalEffective: number;
  rothBalanceShare: number;
  preTaxWithdrawalTaxRatePercent: number;
};

export function getEffectiveRetirementPortfolio(
  traditionalBalance: number,
  rothBalance: number,
  preTaxWithdrawalTaxRatePercent: number
): EffectiveRetirementPortfolio {
  const rothBalanceShare = retirementRothBalanceShare(traditionalBalance, rothBalance);
  const rothGrossEquivalent = rothToGrossEquivalent(rothBalance, preTaxWithdrawalTaxRatePercent);
  const totalEffective = portfolioGrossWithdrawalCapacity(traditionalBalance, rothBalance);

  return {
    traditionalBalance,
    rothBalance,
    rothGrossEquivalent: Math.round(rothGrossEquivalent),
    nominalTotal: traditionalBalance + rothBalance,
    totalEffective: Math.round(totalEffective),
    rothBalanceShare,
    preTaxWithdrawalTaxRatePercent,
  };
}

export function calculateRetirementPlan(
  inputs: RetirementInputs,
  profile?: RetirementProfileContext | Pick<ProfileInputs, 'dateOfBirth'>
): RetirementPlanResult {
  const taxLocation = inputs;
  const months =
    profile && isValidDateOfBirth(profile.dateOfBirth)
      ? monthsUntilRetirementAge(profile.dateOfBirth, inputs.retirementAge)
      : Math.max(Math.round((inputs.retirementAge - inputs.currentAge) * 12), 0);
  const yearsUntilRetirement = months / 12;
  const incomeTargetGross = Math.max(0, inputs.desiredAnnualGrossIncome);
  const desiredAnnualNetIncomeTarget = grossToNetRetirementIncome(incomeTargetGross, taxLocation);
  const withdrawalTaxRate = preTaxWithdrawalTaxRatePercent(taxLocation, incomeTargetGross);

  const totalBalance = inputs.traditionalBalance + inputs.rothBalance;
  const traditionalShare = totalBalance > 0 ? inputs.traditionalBalance / totalBalance : 0.5;
  const monthlyTraditional = inputs.monthlyContributions * traditionalShare;
  const monthlyRoth = inputs.monthlyContributions * (1 - traditionalShare);

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
    monthlyContribution: monthlyTraditional,
  }).projectedBalanceAtRetirement;
  const fvRoth = simulateRetirement({
    ...projectionBase,
    balanceToday: inputs.rothBalance,
    monthlyContribution: monthlyRoth,
  }).projectedBalanceAtRetirement;
  const futureValueInvestments = fvTraditional + fvRoth;
  const fvRothGrossEquivalent = rothToGrossEquivalent(fvRoth, withdrawalTaxRate);
  const futureGrossEquivalentPortfolio = portfolioGrossWithdrawalCapacity(
    fvTraditional,
    fvRothGrossEquivalent
  );

  const portfolioToday = getEffectiveRetirementPortfolio(
    inputs.traditionalBalance,
    inputs.rothBalance,
    withdrawalTaxRate
  );
  const rothGrossEquivalentToday = portfolioToday.rothGrossEquivalent;
  const currentPortfolioGrossEquivalent = portfolioToday.totalEffective;
  const nominalPortfolioTotal = portfolioToday.nominalTotal;

  const profileContext = profile as RetirementProfileContext | undefined;
  const schedule = buildRetirementYearSchedule(inputs, profileContext);

  const socialSecurityGross =
    inputs.socialSecurityMode === 'excluded'
      ? 0
      : Math.max(0, inputs.socialSecurityEstimate);
  const partnerSocialSecurityGross =
    inputs.partnerSocialSecurityMode === 'excluded'
      ? 0
      : Math.max(0, inputs.partnerSocialSecurityEstimate);
  const pensionGross = Math.max(0, inputs.pensionEstimate);
  const partnerAgeAtRetirement =
    profileContext?.planningMode === 'partner'
      ? (profileContext.partnerAge ?? 0) +
        (inputs.retirementAge - (profileContext.userAge ?? inputs.currentAge))
      : inputs.partnerRetirementAge;
  const otherIncomeGross = annualHouseholdOtherIncomeAtAges(
    inputs.otherIncomeStreams,
    inputs.retirementAge,
    partnerAgeAtRetirement
  );
  const continuingEmploymentGross = annualContinuingEmploymentGrossAtAges(
    profileContext,
    inputs,
    inputs.retirementAge,
    partnerAgeAtRetirement
  );

  const retirementIncomeGap = Math.round(schedule.firstYearNetGap);
  const annualGrossWithdrawalFromPortfolio = Math.round(schedule.firstYearGrossWithdrawal);

  const fundingYears = retirementFundingYears(inputs, profileContext);
  const realReturnInRetirementPercent = realReturnPercent(
    inputs.expectedAnnualReturn,
    inputs.inflationAssumption
  );
  const requiredPortfolioTarget = Math.round(schedule.requiredPortfolioTarget);

  const projectedReadinessPercent =
    requiredPortfolioTarget > 0
      ? Math.min(
          100,
          Math.round((futureGrossEquivalentPortfolio / requiredPortfolioTarget) * 100)
        )
      : 100;

  return {
    yearsUntilRetirement,
    rothGrossEquivalentToday,
    currentPortfolioGrossEquivalent,
    effectiveRetirementPortfolio: currentPortfolioGrossEquivalent,
    rothBalanceShareToday: portfolioToday.rothBalanceShare,
    effectiveRetirementTaxRatePercentToday: withdrawalTaxRate,
    effectiveRetirementTaxRatePercentAtRetirement: withdrawalTaxRate,
    nominalPortfolioTotal,
    futureValueInvestments: Math.round(futureValueInvestments),
    futureGrossEquivalentPortfolio: Math.round(futureGrossEquivalentPortfolio),
    inflationAdjustedIncomeTarget: Math.round(incomeTargetGross),
    desiredAnnualNetIncomeTarget: Math.round(desiredAnnualNetIncomeTarget),
    annualGrossWithdrawalFromPortfolio: Math.round(annualGrossWithdrawalFromPortfolio),
    inflatedSocialSecurity: Math.round(socialSecurityGross),
    inflatedPension: Math.round(pensionGross),
    inflatedPartTimeIncome: Math.round(otherIncomeGross),
    inflatedOtherIncome: Math.round(otherIncomeGross),
    inflatedContinuingEmployment: Math.round(continuingEmploymentGross),
    inflatedPartnerSocialSecurity: Math.round(partnerSocialSecurityGross),
    retirementIncomeGap: Math.round(retirementIncomeGap),
    requiredPortfolioTarget: Math.round(requiredPortfolioTarget),
    realReturnInRetirementPercent: Math.round(realReturnInRetirementPercent * 100) / 100,
    retirementFundingYears: fundingYears,
    projectedReadinessPercent,
  };
}
