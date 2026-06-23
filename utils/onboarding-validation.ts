import type { OnboardingData, OnboardingStepId } from '@/constants/onboarding';
import {
  calculateAgeFromDateOfBirth,
  isValidDateOfBirth,
  normalizeDateOfBirth,
  parseDateOfBirthInput,
} from '@/utils/profile-age';
import { normalizeFiniteNumber } from '@/utils/numbers';

export const ONBOARDING_REQUIRED_STEP_MESSAGE = 'Please complete this step to continue.';

export function onboardingMoneyValue(value: string) {
  return normalizeFiniteNumber(value.replace(/[^0-9.]/g, ''), 0);
}

export type OnboardingValidationState = {
  userDateOfBirth: string;
  partnerDateOfBirth: string;
  userAge: number | null;
  partnerAge: number | null;
  userBase: number;
  partnerBase: number;
  canContinue: boolean;
  feedbackMessage: string | null;
};

export function validateOnboardingStep(
  data: OnboardingData,
  step: OnboardingStepId,
  asOf: Date = new Date()
): OnboardingValidationState {
  const userDateOfBirth =
    normalizeDateOfBirth(data.userDateOfBirth) ??
    parseDateOfBirthInput(data.userDateOfBirth) ??
    '';
  const partnerDateOfBirth =
    normalizeDateOfBirth(data.partnerDateOfBirth) ??
    parseDateOfBirthInput(data.partnerDateOfBirth) ??
    '';
  const userAge = isValidDateOfBirth(userDateOfBirth)
    ? calculateAgeFromDateOfBirth(userDateOfBirth, asOf)
    : null;
  const partnerAge = isValidDateOfBirth(partnerDateOfBirth)
    ? calculateAgeFromDateOfBirth(partnerDateOfBirth, asOf)
    : null;
  const userBase = onboardingMoneyValue(data.baseAnnualSalary);
  const partnerBase = onboardingMoneyValue(data.partnerBaseAnnualSalary);

  const canContinue = (() => {
    switch (step) {
      case 'name':
        return data.userName.trim().length > 0;
      case 'age':
        return userAge != null && userAge >= 1 && userAge <= 120;
      case 'planningMode':
        return data.planningMode != null;
      case 'partnerDetails':
        return (
          data.partnerName.trim().length > 0 &&
          partnerAge != null &&
          partnerAge >= 1 &&
          partnerAge <= 120
        );
      case 'income':
        if (userBase <= 0) return false;
        if (data.planningMode === 'partner') return partnerBase > 0;
        return true;
      case 'filingStatus':
        return data.filingStatus != null;
    }
  })();

  return {
    userDateOfBirth,
    partnerDateOfBirth,
    userAge,
    partnerAge,
    userBase,
    partnerBase,
    canContinue,
    feedbackMessage: canContinue ? null : ONBOARDING_REQUIRED_STEP_MESSAGE,
  };
}
