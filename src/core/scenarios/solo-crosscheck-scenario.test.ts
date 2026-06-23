/**
 * Run: npx vitest run src/core/scenarios/solo-crosscheck-scenario.test.ts
 * Prints locked cross-check outputs for manual / external AI verification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCustomGoalBucket,
  buildRetirementBucket,
  getCoreBucketEntries,
  isBucketGroup,
  type BucketEntry,
  type BucketItem,
} from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_EXPENSE_INPUTS } from '@/constants/profile';
import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';
import { buildEnoughScoreGoalProgressRows } from '@/src/core/enough-score/enough-score-goal-progress';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import {
  FIXTURE_SALARY_PROFILE,
  fixtureEmployer401kAccount,
  makeRetirement,
} from '@/src/core/retirement/fixtures';
import {
  calculateExcessSummary,
  flattenBucketsForExcess,
} from '@/utils/bucket-excess';
import { retirementInputsForBucket } from '@/utils/retirement-bucket-sync';
import {
  retirementBucketReadinessPercent,
} from '@/utils/retirement-bucket-readiness';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { retirementInputsWithProfileAges } from '@/utils/profile-age';
import { getHouseholdAnnualIncome } from '@/constants/profile';
import { syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';

const AS_OF = new Date('2026-06-05T12:00:00Z');

function bucketById(entries: BucketEntry[], bucketId: string): BucketItem {
  const bucket = entries.find((entry) => !isBucketGroup(entry) && entry.id === bucketId);
  expect(bucket, `${bucketId} bucket should exist`).toBeDefined();
  return bucket as BucketItem;
}

function buildSoloScenario() {
  const emergencySavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'hysa-emergency',
    name: 'High-yield savings',
    currentValue: 22_000,
    investmentMix: 'cash' as const,
  };
  const slushSavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'chk-slush',
    name: 'Checking buffer',
    currentValue: 2_800,
    investmentMix: 'cash' as const,
  };
  const account401k = fixtureEmployer401kAccount();
  const vacationSavings = {
    ...createEmptyFinancialAccount('savings'),
    id: 'sav-vacation',
    name: 'Vacation savings',
    currentValue: 3_000,
    investmentMix: 'cash' as const,
  };
  const vacationGoal = buildCustomGoalBucket({
    id: 'custom-vacation',
    name: 'Vacation Fund',
    accent: '#7C6FD4',
    target: 5_000,
  });

  const allAccounts = [emergencySavings, slushSavings, account401k, vacationSavings];

  const profile = {
    ...FIXTURE_SALARY_PROFILE,
    planningMode: 'solo' as const,
    annualIncome: 95_000,
    dateOfBirth: '1986-03-15',
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
        'custom-vacation': [vacationSavings.id],
      },
    },
  };

  const synced = syncRetirementFromBucketAccounts([account401k], profile);
  const retirement = makeRetirement({
    currentAge: 40,
    retirementAge: 65,
    incomeReplacementPercent: 84,
    desiredAnnualGrossIncome: 80_000,
    socialSecurityMode: 'excluded',
    socialSecurityEstimate: 0,
    pensionEstimate: 0,
    otherIncomeStreams: [],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    investmentGrowthMode: 'balanced',
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'single',
    lifeExpectancy: 95,
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
      vacationGoal,
      [vacationSavings],
      retirementForBuckets,
      profile
    ),
  ];

  return {
    profile,
    retirement,
    retirementForBuckets,
    expenseTargets,
    bucketEntries,
    accounts: { emergencySavings, slushSavings, account401k, vacationSavings },
  };
}

describe('solo cross-check scenario', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints app displays and calculation trail', () => {
    const scenario = buildSoloScenario();
    const { profile, retirementForBuckets, expenseTargets, bucketEntries } = scenario;

    const enoughScoreResult = computeEnoughScoreFromBuckets(bucketEntries);
    const excessLines = flattenBucketsForExcess(bucketEntries);
    const excessSummary = calculateExcessSummary(excessLines, {
      emergency: true,
      slush: true,
      retirement: true,
      'custom-vacation': true,
    });

    const retirementBucket = bucketById(bucketEntries, 'retirement');
    const plan = calculateRetirementPlan(retirementForBuckets, profile);
    const readinessPercent = retirementBucketReadinessPercent(retirementBucket);
    const goalRows = buildEnoughScoreGoalProgressRows(excessLines, enoughScoreResult);

    const emergency = bucketById(bucketEntries, 'emergency');
    const slush = bucketById(bucketEntries, 'slush');
    const vacation = bucketById(bucketEntries, 'custom-vacation');

    const output = {
      scenarioName: 'Solo Alex — Texas renter, age 40 → 65',
      asOfDate: AS_OF.toISOString().slice(0, 10),
      inputs: {
        profile: {
          planningMode: profile.planningMode,
          annualIncome: profile.annualIncome,
          dateOfBirth: profile.dateOfBirth,
          monthlyHousingCost: profile.expenses.monthlyHousingCost,
          monthlyEssentialsExHousing: profile.expenses.monthlyEssentialsExHousing,
          monthlyDiscretionary: profile.expenses.monthlyDiscretionary,
          emergencyCoverageMonths: profile.expenses.emergencyCoverageMonths,
          slushCoverageMonths: profile.expenses.slushCoverageMonths,
        },
        retirement: {
          retirementAge: retirementForBuckets.retirementAge,
          desiredAnnualGrossIncome: retirementForBuckets.desiredAnnualGrossIncome,
          expectedAnnualReturn: retirementForBuckets.expectedAnnualReturn,
          inflationAssumption: retirementForBuckets.inflationAssumption,
          lifeExpectancy: retirementForBuckets.lifeExpectancy,
          state: retirementForBuckets.retirementStateOfResidence,
          filingStatus: retirementForBuckets.retirementFilingStatus,
          socialSecurityMode: retirementForBuckets.socialSecurityMode,
        },
        accounts: {
          emergency: { balance: 22_000, mix: 'cash' },
          slush: { balance: 2_800, mix: 'cash' },
          vacation: { balance: 3_000, mix: 'cash' },
          '401k': {
            preTax: 150_000,
            roth: 50_000,
            mix: 'balanced',
            employeePreTaxPct: 6,
            employerMatchPct: 3,
          },
          vacationCustomGoalTarget: 5_000,
        },
        derivedTargets: expenseTargets,
      },
      enoughScoreLandingPage: {
        enoughScore: enoughScoreResult.enoughScore,
        ringPercent: enoughScoreResult.enoughScore,
        goalsSection: goalRows.map((row) => ({
          name: row.name,
          percent: row.percentLabel,
          subtitle: row.subtitle,
        })),
        weightedContributions: enoughScoreResult.weightedContributions,
        completions: {
          emergency: enoughScoreResult.emergencyCompletion,
          retirement: enoughScoreResult.retirementCompletion,
          slush: enoughScoreResult.slushCompletion,
          customGoals: enoughScoreResult.customGoalBreakdown,
        },
      },
      bucketsTab: {
        emergency: {
          current: emergency.current,
          target: emergency.target,
          ringPercent: Math.round((emergency.current / emergency.target) * 100),
        },
        slush: {
          current: slush.current,
          target: slush.target,
          ringPercent: Math.round((slush.current / slush.target) * 100),
        },
        retirement: {
          estimatedRetirementNeed: retirementBucket.target,
          estimatedRetirementBalance: retirementBucket.projectedGrossEquivalent,
          currentAmount: retirementBucket.current,
          ringPercent: Math.round((retirementBucket.readinessProgress ?? 0) * 100),
        },
        vacation: {
          current: vacation.current,
          target: vacation.target,
          ringPercent: Math.round((vacation.current / vacation.target) * 100),
        },
      },
      myExcessTab: {
        sumOfAllExcessFunds: excessSummary.totalExcess,
        bucketsWithExcess: excessSummary.includedLines.map((line) => ({
          name: line.name,
          excess: line.excess,
        })),
        allBuckets: excessSummary.lines.map((line) => ({
          name: line.name,
          current: line.current,
          target: line.target,
          excess: line.excess,
        })),
        retirementPace: {
          estimatedRetirementReadiness: readinessPercent,
          estimatedRetirementBalance: retirementBucket.projectedGrossEquivalent,
          estimatedRetirementNeed: retirementBucket.target,
          paceStatus: (readinessPercent ?? 0) >= 100 ? 'Ahead' : 'Behind',
        },
        note: 'Readiness matches Buckets tab (per-account projection), not aggregate plan.projectedReadinessPercent',
        aggregatePlanReadinessPercent: plan.projectedReadinessPercent,
      },
      calculationTrail: {
        emergencyMonthlyFloor:
          profile.expenses.monthlyEssentialsExHousing +
          profile.expenses.monthlyHousingCost,
        emergencyTargetFormula: 'monthlyFloor × emergencyMonths',
        slushMonthlyTotal:
          profile.expenses.monthlyEssentialsExHousing +
          profile.expenses.monthlyHousingCost +
          profile.expenses.monthlyDiscretionary,
        slushTargetFormula: 'monthlyTotal × slushMonths',
        retirementReadinessFormula:
          'min(100, round(projectedGrossEquivalent ÷ estimatedRetirementNeed × 100))',
        enoughScoreFormula:
          '35%×emergency + 35%×retirement + 15%×slush + 15%×custom (split evenly); min 1 max 100',
        excessFormula: 'max(0, current − target) per bucket',
      },
    };

    // eslint-disable-next-line no-console
    console.log('\n' + JSON.stringify(output, null, 2) + '\n');
    expect(output.enoughScoreLandingPage.enoughScore).toBeGreaterThan(0);
  });
});
