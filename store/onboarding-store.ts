import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_ONBOARDING_DATA,
  getOnboardingSteps,
  type OnboardingData,
} from '@/constants/onboarding';

type OnboardingStore = {
  data: OnboardingData;
  stepIndex: number;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setStepIndex: (stepIndex: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateData: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
};

function clampStep(index: number, planningMode: OnboardingData['planningMode']) {
  const max = getOnboardingSteps(planningMode).length - 1;
  return Math.min(Math.max(index, 0), max);
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: DEFAULT_ONBOARDING_DATA,
      stepIndex: 0,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setStepIndex: (stepIndex) =>
        set((state) => ({
          stepIndex: clampStep(stepIndex, state.data.planningMode),
        })),
      nextStep: () =>
        set((state) => ({
          stepIndex: clampStep(state.stepIndex + 1, state.data.planningMode),
        })),
      previousStep: () =>
        set((state) => ({
          stepIndex: clampStep(state.stepIndex - 1, state.data.planningMode),
        })),
      updateData: (patch) =>
        set((state) => {
          const data = { ...state.data, ...patch };
          return {
            data,
            stepIndex: clampStep(state.stepIndex, data.planningMode),
          };
        }),
      reset: () => set({ data: DEFAULT_ONBOARDING_DATA, stepIndex: 0 }),
    }),
    {
      name: 'enough-onboarding-v2',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
