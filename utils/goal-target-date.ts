import { toYearMonthKey } from '@/src/core/shared/dates';
import { formatMonthYearDisplay, parseMonthYearToIso } from '@/utils/month-year-input';

/** First day of a target month, `monthsAhead` from today. */
export function defaultGoalTargetMonth(monthsAhead: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(1);
  date.setMonth(date.getMonth() + monthsAhead);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function defaultGoalTargetMonthDisplay(monthsAhead: number, from = new Date()): string {
  return formatMonthYearDisplay(defaultGoalTargetMonth(monthsAhead, from));
}

export function parseGoalTargetMonthAnswer(display: string): string | null {
  return parseMonthYearToIso(display);
}

export function monthsUntilGoalTarget(iso: string, from = new Date()): number {
  const targetKey = toYearMonthKey(iso);
  if (targetKey == null) return 0;

  const currentKey = from.getFullYear() * 100 + (from.getMonth() + 1);
  const targetYear = Math.floor(targetKey / 100);
  const targetMonth = targetKey % 100;
  const currentYear = from.getFullYear();
  const currentMonth = from.getMonth() + 1;

  return (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
}

export function goalHorizonYearsFromTargetMonth(iso: string, from = new Date()): number {
  return Math.max(monthsUntilGoalTarget(iso, from), 0) / 12;
}
