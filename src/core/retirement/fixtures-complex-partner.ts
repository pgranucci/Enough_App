import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs, RetirementOtherIncomeStream } from '@/constants/retirement';

import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

function incomeStream(
  overrides: Partial<RetirementOtherIncomeStream>
): RetirementOtherIncomeStream {
  return {
    id: 'stream-1',
    name: '',
    monthlyGross: 0,
    startAge: 65,
    endAge: 90,
    assignedTo: 'self',
    isWorkInRetirement: false,
    ...overrides,
  };
}

function employer401k(
  id: string,
  owner: FinancialAccount['accountOwner'],
  preTax: number,
  roth: number,
  employeePreTaxPercent: number,
  employeeRothPercent: number,
  employerMatchPercent: number
): FinancialAccount {
  return {
    ...createEmptyFinancialAccount('retirement'),
    id,
    accountOwner: owner,
    name: owner === 'partner' ? 'Partner 401(k)' : 'My 401(k)',
    isEmployerPlan: true,
    preTaxCurrentValue: preTax,
    rothCurrentValue: roth,
    currentValue: preTax + roth,
    investmentMix: owner === 'partner' ? 'conservative' : 'balanced',
    employeePreTaxContributionPercent: employeePreTaxPercent,
    employeeRothContributionPercent: employeeRothPercent,
    employerMatchPercent: employerMatchPercent,
    employerProfitSharingPercent: 0,
    annualContributionDollars: 0,
  };
}

/**
 * Two spouses (38 and 41 today), retire at 62 and 64, FL married filing jointly,
 * multiple accounts (pre-tax + Roth 401(k)s, brokerages), pension, SS for both,
 * and two other-income streams timed to each spouse's retirement age.
 */
export function fixtureComplexPartnerHousehold(): {
  profile: ProfileInputs;
  retirement: RetirementInputs;
  accounts: FinancialAccount[];
} {
  const profile = makeProfile({
    planningMode: 'partner',
    partnerName: 'Alex',
    userName: 'Jordan',
    dateOfBirth: '',
    partnerDateOfBirth: '',
    userAge: 38,
    partnerAge: 41,
    filingStatus: 'married_joint',
    annualIncome: 120_000,
    partnerAnnualIncome: 85_000,
    partnerBaseAnnualSalary: 85_000,
  });

  const accounts: FinancialAccount[] = [
    employer401k('401k-self', 'self', 180_000, 45_000, 8, 2, 4),
    employer401k('401k-partner', 'partner', 95_000, 55_000, 6, 4, 3),
    {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-self',
      accountOwner: 'self',
      currentValue: 52_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 3_600,
    },
    {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-partner',
      accountOwner: 'partner',
      currentValue: 28_000,
      investmentMix: 'aggressive',
      estimatedAnnualSavings: 2_400,
    },
  ];

  const retirement = makeRetirement({
    currentAge: 38,
    retirementAge: 62,
    partnerRetirementAge: 64,
    lifeExpectancy: 92,
    partnerLifeExpectancy: 94,
    retirementStateOfResidence: 'FL',
    retirementFilingStatus: 'married_joint',
    incomeReplacementPercent: 75,
    desiredAnnualGrossIncome: 153_750,
    socialSecurityEstimate: 28_000,
    socialSecurityClaimAge: 62,
    partnerSocialSecurityEstimate: 22_000,
    partnerSocialSecurityClaimAge: 64,
    pensionEstimate: 12_000,
    partTimeRetirementIncome: 0,
    otherIncomeStreams: [
      incomeStream({
        id: 'consult-self',
        name: 'Consulting',
        monthlyGross: 1_500,
        startAge: 62,
        endAge: 70,
        assignedTo: 'self',
      }),
      incomeStream({
        id: 'rental-partner',
        name: 'Rental property',
        monthlyGross: 2_000,
        startAge: 64,
        endAge: 85,
        assignedTo: 'partner',
      }),
    ],
    traditionalBalance: 355_000,
    rothBalance: 100_000,
    monthlyContributions: 2_400,
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    accounts,
  });

  return { profile, retirement, accounts };
}
