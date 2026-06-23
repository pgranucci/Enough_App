import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';

import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import type { ProfileInputs } from '@/constants/profile';
import { useOnboardingStore } from '@/store/onboarding-store';

const ONBOARDING_STORAGE_KEYS = ['enough-onboarding-v2', 'enough-onboarding-v1'] as const;

/** Clears persisted onboarding wizard state. */
export async function clearOnboardingPersistence() {
  await AsyncStorage.multiRemove([...ONBOARDING_STORAGE_KEYS]);
  useOnboardingStore.getState().reset();
}

/** Reset profile flags so AuthGate routes back into onboarding. */
export function profilePatchForOnboardingReset(
  current: ProfileInputs
): Partial<ProfileInputs> {
  return {
    onboardingCompleted: false,
    userName: '',
    partnerName: '',
    planningMode: 'solo',
    partnerAge: 0,
    partnerDateOfBirth: '',
    partnerAnnualIncome: 0,
    partnerBaseAnnualSalary: null,
    partnerAnnualBonus: 0,
    partnerAnnualCommission: 0,
    incomeEntryMode: null,
    baseAnnualSalary: null,
    hourlyWage: null,
    averageWeeklyHours: null,
    annualBonus: 0,
    annualCommission: 0,
    annualIncome: DEFAULT_PROFILE_INPUTS.annualIncome,
    userAge: current.userAge,
    dateOfBirth: current.dateOfBirth,
    filingStatus: current.filingStatus,
    stateOfResidence: current.stateOfResidence,
  };
}

export type ResetOnboardingForDevOptions = {
  updateProfile: (patch: Partial<ProfileInputs>) => void;
  getProfile: () => ProfileInputs;
  navigate: (href: Href) => void;
  refresh?: () => Promise<void>;
};

/** Dev-only: wipe onboarding progress and open the first onboarding step. */
export async function resetOnboardingForDev({
  updateProfile,
  getProfile,
  navigate,
  refresh,
}: ResetOnboardingForDevOptions) {
  await clearOnboardingPersistence();
  updateProfile(profilePatchForOnboardingReset(getProfile()));
  if (refresh) {
    await refresh();
  }
  navigate('/(onboarding)' as Href);
}
