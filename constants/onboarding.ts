import type { FilingStatus, PlanningMode } from '@/constants/profile';

export type OnboardingStepId =
  | 'name'
  | 'age'
  | 'planningMode'
  | 'partnerDetails'
  | 'income'
  | 'filingStatus';

export type OnboardingData = {
  userName: string;
  userDateOfBirth: string;
  planningMode: PlanningMode | null;
  partnerName: string;
  partnerDateOfBirth: string;
  baseAnnualSalary: string;
  annualBonus: string;
  annualCommission: string;
  partnerBaseAnnualSalary: string;
  partnerAnnualBonus: string;
  partnerAnnualCommission: string;
  filingStatus: FilingStatus | null;
};

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  userName: '',
  userDateOfBirth: '',
  planningMode: null,
  partnerName: '',
  partnerDateOfBirth: '',
  baseAnnualSalary: '',
  annualBonus: '',
  annualCommission: '',
  partnerBaseAnnualSalary: '',
  partnerAnnualBonus: '',
  partnerAnnualCommission: '',
  filingStatus: null,
};

/** Steps shown in the wizard; partner details only when planning with a partner. */
export function getOnboardingSteps(planningMode: PlanningMode | null): OnboardingStepId[] {
  const steps: OnboardingStepId[] = ['name', 'age', 'planningMode'];
  if (planningMode === 'partner') {
    steps.push('partnerDetails');
  }
  steps.push('income', 'filingStatus');
  return steps;
}
