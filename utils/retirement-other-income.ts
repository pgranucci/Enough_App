import type { RetirementOtherIncomeStream } from '@/constants/retirement';
import { clampAge } from '@/utils/profile-age';

function isStreamActiveAtAge(stream: RetirementOtherIncomeStream, age: number): boolean {
  const atAge = clampAge(age);
  const start = clampAge(stream.startAge);
  const end = clampAge(stream.endAge);
  if (end > 0 && start > end) return false;
  if (atAge < start) return false;
  if (end > 0 && atAge > end) return false;
  return true;
}

/** Sum gross annual income from streams active at the given age. */
export function annualOtherIncomeAtAge(
  streams: RetirementOtherIncomeStream[],
  age: number
): number {
  const atAge = clampAge(age);
  return streams.reduce((sum, stream) => {
    if (!isStreamActiveAtAge(stream, atAge)) return sum;
    return sum + Math.max(0, stream.monthlyGross) * 12;
  }, 0);
}

/** Household total: each stream is evaluated at the assignee's retirement age. */
export { annualHouseholdOtherIncomeAtRetirement } from '@/src/core/retirement/year-by-year-income';
