import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS, type ProfileInputs } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, type RetirementInputs } from '@/constants/retirement';

export function makeProfile(overrides: Partial<ProfileInputs> = {}): ProfileInputs {
  return { ...DEFAULT_PROFILE_INPUTS, ...overrides };
}

export function makeRetirement(overrides: Partial<RetirementInputs> = {}): RetirementInputs {
  return { ...DEFAULT_RETIREMENT_INPUTS, ...overrides };
}

/** Profile income used so 401(k) % deferrals are deterministic in tests. */
export const FIXTURE_SALARY_PROFILE = makeProfile({ annualIncome: 95_000, dateOfBirth: '' });

/** Solo planner: 40 → 65, TX, no SS, $100k pre-tax + $50k Roth, $1k/mo total contributions. */
export function fixtureSoloTexasAccumulation(): {
  retirement: RetirementInputs;
  profile: ProfileInputs;
} {
  return {
    profile: FIXTURE_SALARY_PROFILE,
    retirement: makeRetirement({
      currentAge: 40,
      retirementAge: 65,
      traditionalBalance: 100_000,
      rothBalance: 50_000,
      monthlyContributions: 1_000,
      desiredAnnualGrossIncome: 80_000,
      socialSecurityEstimate: 0,
      partnerSocialSecurityEstimate: 0,
      pensionEstimate: 0,
      partTimeRetirementIncome: 0,
      otherIncomeStreams: [],
      expectedAnnualReturn: 7.5,
      inflationAssumption: 2.5,
      retirementStateOfResidence: 'TX',
      retirementFilingStatus: 'single',
      lifeExpectancy: 95,
      partnerLifeExpectancy: 95,
      accounts: [],
    }),
  };
}

/** Income goal fully covered by Social Security — portfolio need should be 0. */
export function fixtureSocialSecurityCoversGoal(): {
  retirement: RetirementInputs;
  profile: ProfileInputs;
} {
  return {
    profile: FIXTURE_SALARY_PROFILE,
    retirement: makeRetirement({
      currentAge: 35,
      retirementAge: 65,
      socialSecurityClaimAge: 65,
      desiredAnnualGrossIncome: 40_000,
      socialSecurityEstimate: 50_000,
      traditionalBalance: 10_000,
      rothBalance: 0,
      monthlyContributions: 0,
      retirementStateOfResidence: 'TX',
      retirementFilingStatus: 'single',
    }),
  };
}

/** Partner mode: longer funding horizon from partner life expectancy. */
export function fixturePartnerFundingHorizon(
  overrides: Partial<RetirementInputs> = {}
): RetirementInputs {
  return makeRetirement({
    currentAge: 40,
    retirementAge: 65,
    partnerRetirementAge: 67,
    lifeExpectancy: 90,
    partnerLifeExpectancy: 95,
    ...overrides,
  });
}

export function fixtureEmployer401kAccount(): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('retirement'),
    id: '401k-fixture',
    name: '401(k)',
    isEmployerPlan: true,
    preTaxCurrentValue: 150_000,
    rothCurrentValue: 50_000,
    currentValue: 200_000,
    investmentMix: 'balanced',
    employeePreTaxContributionPercent: 6,
    employeeRothContributionPercent: 0,
    employerMatchPercent: 3,
    employerProfitSharingPercent: 0,
    annualContributionDollars: 0,
  };
}

export function fixtureBrokerageAccount(): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('brokerage'),
    id: 'brk-fixture',
    currentValue: 75_000,
    investmentMix: 'balanced',
    estimatedAnnualSavings: 6_000,
  };
}
