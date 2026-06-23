import { clampAge } from '@/utils/profile-age';

/** SSA bend points for PIA (2024 dollars). */
const BEND_POINT_1 = 1115;
const BEND_POINT_2 = 6721;
const FULL_RETIREMENT_AGE = 67;
/** Social Security taxable maximum earnings (approx. 2024). */
const MAX_TAXABLE_EARNINGS = 168_600;

function estimateAime(annualGrossIncome: number): number {
  const capped = Math.min(Math.max(annualGrossIncome, 0), MAX_TAXABLE_EARNINGS);
  return capped / 12;
}

/** Primary Insurance Amount (monthly) at full retirement age — simplified career-average model. */
export function estimateMonthlySocialSecurityAtFra(annualGrossIncome: number): number {
  const aime = estimateAime(annualGrossIncome);
  let pia = 0;
  const tier1 = Math.min(aime, BEND_POINT_1);
  pia += tier1 * 0.9;
  if (aime > BEND_POINT_1) {
    pia += (Math.min(aime, BEND_POINT_2) - BEND_POINT_1) * 0.32;
  }
  if (aime > BEND_POINT_2) {
    pia += (aime - BEND_POINT_2) * 0.15;
  }
  return Math.max(0, pia);
}

/** Adjustment vs. claiming at full retirement age (67). */
function claimingMultiplier(claimAge: number): number {
  const age = clampAge(claimAge);
  if (age < 62) return claimingMultiplier(62);
  if (age > 70) return claimingMultiplier(70);

  if (age >= FULL_RETIREMENT_AGE) {
    const yearsDelayed = Math.min(age - FULL_RETIREMENT_AGE, 3);
    return 1 + yearsDelayed * 0.08;
  }

  const yearsEarly = FULL_RETIREMENT_AGE - age;
  if (yearsEarly <= 3) {
    return Math.max(0.7, 1 - yearsEarly * 0.067);
  }
  return Math.max(0.7, 1 - 3 * 0.067 - (yearsEarly - 3) * 0.05);
}

/** Estimated annual Social Security benefit at the given claiming age. */
export function estimateAnnualSocialSecurity(
  annualGrossIncome: number,
  claimAge: number
): number {
  const monthly = estimateMonthlySocialSecurityAtFra(annualGrossIncome) * claimingMultiplier(claimAge);
  return Math.round(monthly * 12);
}
