import type { FilingStatus, ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import type { USStateCode } from '@/constants/us-states';

/** Retirement tax location, falling back to current profile when unset on legacy rows. */
export function getRetirementTaxLocation(
  retirement: Pick<RetirementInputs, 'retirementStateOfResidence' | 'retirementFilingStatus'>,
  profile: Pick<ProfileInputs, 'stateOfResidence' | 'filingStatus'>
): { stateOfResidence: USStateCode; filingStatus: FilingStatus } {
  return {
    stateOfResidence: retirement.retirementStateOfResidence ?? profile.stateOfResidence,
    filingStatus: retirement.retirementFilingStatus ?? profile.filingStatus,
  };
}
