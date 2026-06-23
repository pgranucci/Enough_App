import type { ProfileInputs } from '@/constants/profile';
import { getHouseholdAnnualIncome } from '@/constants/profile';
import { calculateAgeFromDateOfBirth, clampAge } from '@/utils/profile-age';
import { estimateAnnualIncomeTax } from '@/utils/income-tax-estimate';

export type ProfileTaxResult = {
  currentAge: number | null;
  taxableIncome: number;
  estimatedFederalTax: number;
  estimatedMarginalRate: number;
  estimatedFederalBracketLabel: string;
  stateAppliesIncomeTax: boolean;
  stateOfResidenceLabel: string;
  estimatedStateTax: number;
  estimatedStateBracketLabel: string;
  estimatedTotalTax: number;
  estimatedAfterTaxIncome: number;
  isValid: boolean;
};

export { calculateAgeFromDateOfBirth } from '@/utils/profile-age';
export { estimateAnnualIncomeTax } from '@/utils/income-tax-estimate';
export type { IncomeTaxEstimate } from '@/utils/income-tax-estimate';

function getProfileUserAge(profile: ProfileInputs): number | null {
  const fromDob = calculateAgeFromDateOfBirth(profile.dateOfBirth);
  if (fromDob != null) return fromDob;
  if (profile.userAge != null && Number.isFinite(profile.userAge)) {
    const age = clampAge(profile.userAge);
    return age >= 0 && age <= 120 ? age : null;
  }
  return null;
}

export function calculateProfileTax(profile: ProfileInputs): ProfileTaxResult {
  const currentAge = getProfileUserAge(profile);
  const grossIncome = getHouseholdAnnualIncome(profile);
  const estimate = estimateAnnualIncomeTax(
    grossIncome,
    profile.filingStatus,
    profile.stateOfResidence
  );

  return {
    currentAge,
    taxableIncome: estimate.taxableIncome,
    estimatedFederalTax: estimate.estimatedFederalTax,
    estimatedMarginalRate: estimate.estimatedMarginalRate,
    estimatedFederalBracketLabel: estimate.estimatedFederalBracketLabel,
    stateAppliesIncomeTax: estimate.stateAppliesIncomeTax,
    stateOfResidenceLabel: estimate.stateOfResidenceLabel,
    estimatedStateTax: estimate.estimatedStateTax,
    estimatedStateBracketLabel: estimate.estimatedStateBracketLabel,
    estimatedTotalTax: estimate.estimatedTotalTax,
    estimatedAfterTaxIncome: estimate.estimatedNetIncome,
    isValid: currentAge != null && grossIncome >= 0,
  };
}
