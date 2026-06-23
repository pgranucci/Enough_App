import type { ProfileInputs } from '@/constants/profile';
import {
  normalizeLifeExpectancy,
  type RetirementInputs,
  type RetirementOtherIncomeStream,
} from '@/constants/retirement';
import {
  grossToNetRetirementIncome,
  householdNetIncomeAfterTax,
  solvePortfolioGrossWithdrawalForHouseholdNetGoal,
} from '@/utils/retirement-income-tax';
import {
  ageFromPartnerDateOfBirth,
  ageFromProfileDateOfBirth,
  isValidDateOfBirth,
} from '@/utils/profile-age';
import { realReturnPercent } from '@/src/core/shared/projection';
import {
  annualContinuingEmploymentGrossAtAges,
  type ContinuingEmploymentProfile,
} from '@/src/core/retirement/continuing-employment-income';
import { annualWorkInRetirementWagesAtAges } from '@/src/core/retirement/work-in-retirement-wages';
import { estimateHouseholdEmployeePayrollTax } from '@/utils/payroll-tax';

export type RetirementProfileContext = Pick<
  ProfileInputs,
  | 'dateOfBirth'
  | 'partnerDateOfBirth'
  | 'userAge'
  | 'partnerAge'
  | 'planningMode'
> &
  ContinuingEmploymentProfile;

export type RetirementYearRow = {
  age: number;
  partnerAge: number;
  desiredNetIncome: number;
  socialSecurityNet: number;
  partnerSocialSecurityNet: number;
  pensionNet: number;
  continuingEmploymentNet: number;
  otherIncomeNet: number;
  netPortfolioNeed: number;
  grossPortfolioWithdrawal: number;
};

export type RetirementYearScheduleResult = {
  rows: RetirementYearRow[];
  /** PV at the first retirement year of scheduled gross withdrawals (today's dollars). */
  requiredPortfolioTarget: number;
  /** Net gap in the first year of retirement (age = retirementAge). */
  firstYearNetGap: number;
  /** Gross portfolio withdrawal in the first retirement year. */
  firstYearGrossWithdrawal: number;
};

function resolveSelfCurrentAge(
  inputs: RetirementInputs,
  profile?: RetirementProfileContext
): number {
  if (profile) {
    const fromDob = ageFromProfileDateOfBirth(profile);
    if (fromDob != null) return fromDob;
    if (profile.userAge > 0) return profile.userAge;
  }
  return inputs.currentAge;
}

function resolvePartnerCurrentAge(
  inputs: RetirementInputs,
  profile?: RetirementProfileContext
): number {
  if (profile?.planningMode !== 'partner') return 0;
  if (profile) {
    const fromDob = ageFromPartnerDateOfBirth(profile);
    if (fromDob != null) return fromDob;
    if (profile.partnerAge > 0) return profile.partnerAge;
  }
  return 0;
}

function partnerAgeWhenSelfIsAge(
  selfAge: number,
  selfCurrentAge: number,
  partnerCurrentAge: number
): number {
  return partnerCurrentAge + (selfAge - selfCurrentAge);
}

function isStreamActiveAtAge(stream: RetirementOtherIncomeStream, age: number): boolean {
  const atAge = Math.min(120, Math.max(0, Math.round(age)));
  const start = Math.min(120, Math.max(0, Math.round(stream.startAge)));
  const end = Math.min(120, Math.max(0, Math.round(stream.endAge)));
  if (end > 0 && start > end) return false;
  if (atAge < start) return false;
  if (end > 0 && atAge > end) return false;
  return true;
}

/** Gross annual household other income when self is `selfAge` and partner is `partnerAge`. */
export function annualHouseholdOtherIncomeAtAges(
  streams: RetirementOtherIncomeStream[],
  selfAge: number,
  partnerAge: number
): number {
  return streams.reduce((sum, stream) => {
    const age = stream.assignedTo === 'partner' ? partnerAge : selfAge;
    if (!isStreamActiveAtAge(stream, age)) return sum;
    return sum + Math.max(0, stream.monthlyGross) * 12;
  }, 0);
}

type FundingHorizonProfile = Pick<ProfileInputs, 'planningMode'>;

/** Years portfolio must fund withdrawals from the primary earner's retirement age. */
export function retirementFundingYears(
  inputs: RetirementInputs,
  profile?: FundingHorizonProfile
): number {
  const selfYears = Math.max(
    0,
    normalizeLifeExpectancy(inputs.lifeExpectancy) - inputs.retirementAge
  );
  if (profile?.planningMode !== 'partner') {
    return Math.max(selfYears, 1);
  }
  const partnerYears = Math.max(
    0,
    normalizeLifeExpectancy(inputs.partnerLifeExpectancy) - inputs.partnerRetirementAge
  );
  return Math.max(selfYears, partnerYears, 1);
}

/** Last calendar age (on self timeline) the portfolio must fund. */
export function retirementHorizonEndAge(
  inputs: RetirementInputs,
  profile?: FundingHorizonProfile
): number {
  return inputs.retirementAge + retirementFundingYears(inputs, profile);
}

export function presentValueOfScheduledGrossWithdrawals(
  annualGrossWithdrawals: number[],
  realRateDecimal: number
): number {
  if (annualGrossWithdrawals.length === 0) return 0;
  let pv = 0;
  for (let i = 0; i < annualGrossWithdrawals.length; i += 1) {
    pv += annualGrossWithdrawals[i]! / Math.pow(1 + realRateDecimal, i);
  }
  return pv;
}

function portfolioRothBalanceShare(inputs: RetirementInputs): number {
  const traditional = Math.max(inputs.traditionalBalance, 0);
  const roth = Math.max(inputs.rothBalance, 0);
  const total = traditional + roth;
  if (total <= 0) return 0;
  return roth / total;
}

/** @deprecated Use {@link annualHouseholdOtherIncomeAtAges} at retirement ages. */
export function annualHouseholdOtherIncomeAtRetirement(
  streams: RetirementOtherIncomeStream[],
  retirementAge: number,
  partnerRetirementAge: number
): number {
  return annualHouseholdOtherIncomeAtAges(streams, retirementAge, partnerRetirementAge);
}

export function buildRetirementYearSchedule(
  inputs: RetirementInputs,
  profile?: RetirementProfileContext
): RetirementYearScheduleResult {
  const taxLocation = inputs;
  const selfCurrentAge = resolveSelfCurrentAge(inputs, profile);
  const partnerCurrentAge = resolvePartnerCurrentAge(inputs, profile);
  const isPartner = profile?.planningMode === 'partner';

  const desiredNet = grossToNetRetirementIncome(
    Math.max(0, inputs.desiredAnnualGrossIncome),
    taxLocation
  );
  const rothShare = portfolioRothBalanceShare(inputs);

  const startAge = inputs.retirementAge;
  const endAge = retirementHorizonEndAge(inputs, profile);
  const realRate = realReturnPercent(
    inputs.expectedAnnualReturn,
    inputs.inflationAssumption
  ) / 100;

  const rows: RetirementYearRow[] = [];
  const grossWithdrawals: number[] = [];

  for (let age = startAge; age <= endAge; age += 1) {
    const partnerAge = isPartner
      ? partnerAgeWhenSelfIsAge(age, selfCurrentAge, partnerCurrentAge)
      : 0;

    let socialSecurityGross = 0;
    if (
      inputs.socialSecurityMode !== 'excluded' &&
      age >= inputs.socialSecurityClaimAge
    ) {
      socialSecurityGross = Math.max(0, inputs.socialSecurityEstimate);
    }
    const socialSecurityNet = grossToNetRetirementIncome(socialSecurityGross, taxLocation);

    let partnerSocialSecurityGross = 0;
    if (
      isPartner &&
      inputs.partnerSocialSecurityMode !== 'excluded' &&
      partnerAge >= inputs.partnerSocialSecurityClaimAge
    ) {
      partnerSocialSecurityGross = Math.max(0, inputs.partnerSocialSecurityEstimate);
    }
    const partnerSocialSecurityNet = grossToNetRetirementIncome(
      partnerSocialSecurityGross,
      taxLocation
    );

    const pensionGross = age >= startAge ? Math.max(0, inputs.pensionEstimate) : 0;
    const pensionNet = grossToNetRetirementIncome(pensionGross, taxLocation);

    let otherIncomeGross = annualHouseholdOtherIncomeAtAges(
      inputs.otherIncomeStreams,
      age,
      partnerAge
    );
    if (
      inputs.otherIncomeStreams.length === 0 &&
      inputs.partTimeRetirementIncome > 0 &&
      age >= startAge
    ) {
      otherIncomeGross = inputs.partTimeRetirementIncome;
    }
    const otherIncomeNet = grossToNetRetirementIncome(otherIncomeGross, taxLocation);

    const continuingEmploymentGross = annualContinuingEmploymentGrossAtAges(
      profile,
      inputs,
      age,
      partnerAge
    );
    const continuingEmploymentNet = grossToNetRetirementIncome(
      continuingEmploymentGross,
      taxLocation
    );

    const knownGrossIncome =
      socialSecurityGross +
      partnerSocialSecurityGross +
      pensionGross +
      continuingEmploymentGross +
      otherIncomeGross;

    const workWages = annualWorkInRetirementWagesAtAges(
      inputs.otherIncomeStreams,
      profile,
      inputs,
      age,
      partnerAge
    );
    const employeePayrollTax = estimateHouseholdEmployeePayrollTax(
      workWages.self > 0 || workWages.partner > 0
        ? [workWages.self, workWages.partner].filter((w) => w > 0)
        : [],
      taxLocation.retirementFilingStatus
    );

    const netWithoutPortfolio = householdNetIncomeAfterTax(
      knownGrossIncome,
      0,
      rothShare,
      taxLocation,
      employeePayrollTax
    );
    const netPortfolioNeed = Math.max(0, desiredNet - netWithoutPortfolio);
    const grossPortfolioWithdrawal = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      knownGrossIncome,
      rothShare,
      desiredNet,
      taxLocation,
      {},
      employeePayrollTax
    );

    rows.push({
      age,
      partnerAge,
      desiredNetIncome: desiredNet,
      socialSecurityNet,
      partnerSocialSecurityNet,
      pensionNet,
      continuingEmploymentNet,
      otherIncomeNet,
      netPortfolioNeed,
      grossPortfolioWithdrawal,
    });
    grossWithdrawals.push(grossPortfolioWithdrawal);
  }

  const requiredPortfolioTarget = presentValueOfScheduledGrossWithdrawals(
    grossWithdrawals,
    realRate
  );
  const firstRow = rows[0];

  return {
    rows,
    requiredPortfolioTarget,
    firstYearNetGap: firstRow?.netPortfolioNeed ?? 0,
    firstYearGrossWithdrawal: firstRow?.grossPortfolioWithdrawal ?? 0,
  };
}
