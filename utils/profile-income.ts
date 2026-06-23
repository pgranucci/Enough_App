import type { IncomeEntryMode, ProfileInputs } from '@/constants/profile';
import { getPartnerAnnualIncome } from '@/constants/profile';
import {
  annualFromHourly,
  computeTotalAnnualGross,
  type IncomeEntryInput,
} from '@/utils/income';

/** Effective income entry mode for profile UI (defaults salaried when unset). */
export function getEffectiveIncomeEntryMode(profile: ProfileInputs): IncomeEntryMode {
  return profile.incomeEntryMode === 'hourly' ? 'hourly' : 'salary';
}

export function getProfileBonusAndCommission(profile: ProfileInputs): number {
  return Math.max(0, profile.annualBonus) + Math.max(0, profile.annualCommission);
}

export function computeProfileAnnualIncome(profile: ProfileInputs): number {
  const bonus = Math.max(0, profile.annualBonus);
  const commission = Math.max(0, profile.annualCommission);

  if (getEffectiveIncomeEntryMode(profile) === 'hourly') {
    return computeTotalAnnualGross({
      mode: 'hourly',
      hourlyWage: profile.hourlyWage ?? 0,
      averageWeeklyHours: profile.averageWeeklyHours ?? 0,
      annualBonus: bonus,
      annualCommission: commission,
    });
  }

  const base =
    profile.baseAnnualSalary != null
      ? profile.baseAnnualSalary
      : Math.max(profile.annualIncome - bonus - commission, 0);

  return computeTotalAnnualGross({
    mode: 'salary',
    baseAnnualSalary: base,
    annualBonus: bonus,
    annualCommission: commission,
  });
}

/** Merge income field changes and refresh stored total annual gross. */
export function withProfileIncomeUpdate(
  profile: ProfileInputs,
  patch: Partial<ProfileInputs>
): Partial<ProfileInputs> {
  const next = { ...profile, ...patch };
  return {
    ...patch,
    annualIncome: computeProfileAnnualIncome(next),
  };
}

export function profileIncomeEntryFromProfile(profile: ProfileInputs): IncomeEntryInput {
  const bonus = Math.max(0, profile.annualBonus);
  const commission = Math.max(0, profile.annualCommission);

  if (getEffectiveIncomeEntryMode(profile) === 'hourly') {
    return {
      mode: 'hourly',
      hourlyWage: profile.hourlyWage ?? 0,
      averageWeeklyHours: profile.averageWeeklyHours ?? 0,
      annualBonus: bonus,
      annualCommission: commission,
    };
  }

  const base =
    profile.baseAnnualSalary != null
      ? profile.baseAnnualSalary
      : Math.max(profile.annualIncome - bonus - commission, 0);

  return {
    mode: 'salary',
    baseAnnualSalary: base,
    annualBonus: bonus,
    annualCommission: commission,
  };
}

export function hourlyBaseFromProfile(profile: ProfileInputs): number {
  return annualFromHourly(profile.hourlyWage ?? 0, profile.averageWeeklyHours ?? 0);
}

/** Merge partner income fields and refresh stored partner annual total. */
export function withPartnerIncomeUpdate(
  profile: ProfileInputs,
  patch: Partial<ProfileInputs>
): Partial<ProfileInputs> {
  const next = { ...profile, ...patch };
  return {
    ...patch,
    partnerAnnualIncome: getPartnerAnnualIncome(next),
  };
}
