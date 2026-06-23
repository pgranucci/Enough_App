/**
 * Shared partner cross-check scenario builder (non-test module).
 */
import {
  buildCustomGoalBucket,
  getCoreBucketEntries,
  isBucketGroup,
} from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_EXPENSE_INPUTS } from '@/constants/profile';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import {
  FIXTURE_SALARY_PROFILE,
  makeRetirement,
} from '@/src/core/retirement/fixtures';
import { retirementInputsForBucket, syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { retirementInputsWithProfileAges } from '@/utils/profile-age';
import { getHouseholdAnnualIncome } from '@/constants/profile';

export function buildPartnerScenario() {
  const emergencySavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'hysa-emergency',
    name: 'Joint emergency savings',
    currentValue: 28_000,
    investmentMix: 'cash' as const,
  };
  const slushSavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'chk-slush',
    name: 'Joint checking buffer',
    currentValue: 5_000,
    investmentMix: 'cash' as const,
  };
  const account401k = {
    ...createEmptyFinancialAccount('retirement'),
    id: '401k-joint',
    name: 'Alex 401(k)',
    isEmployerPlan: true,
    preTaxCurrentValue: 180_000,
    rothCurrentValue: 60_000,
    currentValue: 240_000,
    investmentMix: 'balanced' as const,
    employeePreTaxContributionPercent: 8,
    employeeRothContributionPercent: 0,
    employerMatchPercent: 4,
    employerProfitSharingPercent: 0,
    annualContributionDollars: 0,
  };
  const houseSavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'sav-house',
    name: 'House down payment',
    currentValue: 7_000,
    investmentMix: 'cash' as const,
  };
  const houseGoal = buildCustomGoalBucket({
    id: 'custom-house',
    name: 'House Down Payment',
    accent: '#D97706',
    target: 12_000,
  });

  const allAccounts = [emergencySavings, slushSavings, account401k, houseSavings];

  const profile = {
    ...FIXTURE_SALARY_PROFILE,
    planningMode: 'partner' as const,
    filingStatus: 'married_joint' as const,
    userName: 'Alex',
    partnerName: 'Jordan',
    annualIncome: 95_000,
    partnerBaseAnnualSalary: 72_000,
    partnerAnnualIncome: 72_000,
    dateOfBirth: '1986-03-15',
    partnerDateOfBirth: '1988-07-01',
    expenses: {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent' as const,
      monthlyHousingCost: 2_200,
      monthlyEssentialsExHousing: 2_800,
      monthlyDiscretionary: 400,
      emergencyCoverageMonths: 6,
      slushCoverageMonths: 3,
      bucketAssignedAccountIds: {
        emergency: [emergencySavings.id],
        slush: [slushSavings.id],
        retirement: [account401k.id],
        'custom-house': [houseSavings.id],
      },
    },
  };

  const synced = syncRetirementFromBucketAccounts([account401k], profile);
  const retirement = makeRetirement({
    currentAge: 40,
    retirementAge: 65,
    partnerRetirementAge: 67,
    incomeReplacementPercent: 75,
    desiredAnnualGrossIncome: 125_000,
    socialSecurityMode: 'manual',
    socialSecurityEstimate: 24_000,
    partnerSocialSecurityMode: 'manual',
    partnerSocialSecurityEstimate: 20_000,
    pensionEstimate: 0,
    otherIncomeStreams: [],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    investmentGrowthMode: 'balanced',
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'married_joint',
    lifeExpectancy: 93,
    partnerLifeExpectancy: 96,
    accounts: allAccounts,
    ...synced,
  });

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirementForBuckets = retirementInputsForBucket(
    retirementInputsWithProfileAges(
      applyIncomeReplacementToRetirement(retirement, householdGross),
      profile
    ),
    profile,
    householdGross,
    profile.expenses.bucketAssignedAccountIds.retirement
  );

  const expenseTargets = resolvePartialExpenseBucketTargets(
    profile.expenses,
    9_000,
    1_500
  );

  const coreEntries = getCoreBucketEntries(
    retirementForBuckets,
    {},
    expenseTargets,
    profile
  );

  const assignedAccountIds: Record<string, string[]> = profile.expenses.bucketAssignedAccountIds;
  const bucketEntries = [
    ...coreEntries.map((entry) => {
      if (isBucketGroup(entry)) return entry;
      const ids = assignedAccountIds[entry.id];
      if (!ids?.length) return entry;
      const accounts = retirement.accounts.filter((a) => ids.includes(a.id));
      if (entry.id === 'retirement') return entry;
      return applyAssignedAccountsToBucket(
        entry,
        accounts,
        retirementForBuckets,
        profile
      );
    }),
    applyAssignedAccountsToBucket(
      houseGoal,
      [houseSavings],
      retirementForBuckets,
      profile
    ),
  ];

  return { profile, retirement, retirementForBuckets, expenseTargets, bucketEntries };
}
