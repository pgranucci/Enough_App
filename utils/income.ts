import type { IncomeEntryMode } from '@/constants/profile';
import { normalizeFiniteNumber } from '@/utils/numbers';

export type SalaryIncomeInput = {
  mode: 'salary';
  baseAnnualSalary: number;
  annualBonus: number;
  annualCommission: number;
};

export type HourlyIncomeInput = {
  mode: 'hourly';
  hourlyWage: number;
  averageWeeklyHours: number;
  annualBonus: number;
  annualCommission: number;
};

export type IncomeEntryInput = SalaryIncomeInput | HourlyIncomeInput;

/** Gross annual from hourly base before bonus/commission. */
export function annualFromHourly(hourlyWage: number, averageWeeklyHours: number): number {
  return hourlyWage * averageWeeklyHours * 52;
}

export function parseMoneyInput(text: string): number {
  return normalizeFiniteNumber(text.replace(/[^0-9.-]/g, ''), 0);
}

export function computeTotalAnnualGross(input: IncomeEntryInput): number {
  const bonus = normalizeFiniteNumber(input.annualBonus, 0);
  const commission = normalizeFiniteNumber(input.annualCommission, 0);

  if (input.mode === 'salary') {
    const base = normalizeFiniteNumber(input.baseAnnualSalary, 0);
    return base + bonus + commission;
  }

  const base = annualFromHourly(
    normalizeFiniteNumber(input.hourlyWage, 0),
    normalizeFiniteNumber(input.averageWeeklyHours, 0)
  );
  return base + bonus + commission;
}
