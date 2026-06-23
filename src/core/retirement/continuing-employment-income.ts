import type { ProfileInputs } from '@/constants/profile';
import { getPartnerAnnualIncome } from '@/constants/profile';
import { computeProfileAnnualIncome } from '@/utils/profile-income';
import type { RetirementInputs } from '@/constants/retirement';

/** Profile fields needed to resolve each spouse's current full-time gross pay. */
export type ContinuingEmploymentProfile = Pick<
  ProfileInputs,
  | 'planningMode'
  | 'partnerAnnualIncome'
  | 'partnerBaseAnnualSalary'
  | 'partnerAnnualBonus'
  | 'partnerAnnualCommission'
  | 'annualIncome'
  | 'baseAnnualSalary'
  | 'incomeEntryMode'
  | 'hourlyWage'
  | 'averageWeeklyHours'
  | 'annualBonus'
  | 'annualCommission'
>;

/**
 * Gross full-time employment for a spouse who has not yet reached their desired retirement age.
 * Used automatically in the year-by-year schedule — not entered via Other Retirement Income.
 */
export function annualContinuingEmploymentGrossAtAges(
  profile: ContinuingEmploymentProfile | undefined,
  inputs: Pick<RetirementInputs, 'retirementAge' | 'partnerRetirementAge'>,
  selfAge: number,
  partnerAge: number
): number {
  if (profile?.planningMode !== 'partner') return 0;

  let gross = 0;

  const breakdown = annualContinuingEmploymentGrossBreakdownAtAges(
    profile,
    inputs,
    selfAge,
    partnerAge
  );
  return breakdown.self + breakdown.partner;
}

/** Self vs partner gross while each is still working full time. */
export function annualContinuingEmploymentGrossBreakdownAtAges(
  profile: ContinuingEmploymentProfile | undefined,
  inputs: Pick<RetirementInputs, 'retirementAge' | 'partnerRetirementAge'>,
  selfAge: number,
  partnerAge: number
): { self: number; partner: number } {
  if (!profile || profile.planningMode !== 'partner') {
    return { self: 0, partner: 0 };
  }

  let self = 0;
  let partner = 0;

  if (partnerAge > 0 && partnerAge < inputs.partnerRetirementAge) {
    partner = getPartnerAnnualIncome(profile as ProfileInputs);
  }

  if (selfAge < inputs.retirementAge) {
    self = computeProfileAnnualIncome(profile as ProfileInputs);
  }

  return { self, partner };
}
