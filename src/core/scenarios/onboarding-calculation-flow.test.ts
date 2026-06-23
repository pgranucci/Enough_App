import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCoreBucketEntries,
  isBucketGroup,
  type BucketEntry,
  type BucketItem,
} from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import {
  DEFAULT_EXPENSE_INPUTS,
  DEFAULT_PROFILE_INPUTS,
  getHouseholdAnnualIncome,
  type ProfileInputs,
} from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, type RetirementInputs } from '@/constants/retirement';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import { buildEnoughScoreGoalProgressRows } from '@/src/core/enough-score/enough-score-goal-progress';
import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';
import { calculateAgeFromDateOfBirth, retirementInputsWithProfileAges } from '@/utils/profile-age';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { retirementInputsForBucket } from '@/utils/retirement-bucket-sync';
import {
  calculateExcessSummary,
  flattenBucketsForExcess,
} from '@/utils/bucket-excess';

const AS_OF = new Date('2026-06-22T12:00:00Z');

function expectFiniteNumbers(value: unknown, path = 'result') {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} should be finite`).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => expectFiniteNumbers(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      expectFiniteNumbers(nested, `${path}.${key}`);
    });
  }
}

function expectPercent(value: number, label: string) {
  expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
  expect(value, `${label} should be at least 0`).toBeGreaterThanOrEqual(0);
  expect(value, `${label} should be at most 100`).toBeLessThanOrEqual(100);
}

function bucketById(entries: BucketEntry[], bucketId: string): BucketItem {
  const bucket = entries.find((entry) => !isBucketGroup(entry) && entry.id === bucketId);
  expect(bucket, `${bucketId} bucket should exist`).toBeDefined();
  return bucket as BucketItem;
}

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function buildOnboardingScenario() {
  const retirementAccount = {
    ...createEmptyFinancialAccount('retirement'),
    id: 'retirement-savings',
    name: 'Retirement Savings',
    currentValue: 206_000,
    preTaxCurrentValue: 206_000,
    rothCurrentValue: 0,
    investmentMix: 'balanced' as const,
  };

  const profile: ProfileInputs = {
    ...DEFAULT_PROFILE_INPUTS,
    userName: 'Onboarding User',
    planningMode: 'solo',
    dateOfBirth: '1998-06-23',
    userAge: 27,
    annualIncome: 75_000,
    baseAnnualSalary: 75_000,
    annualBonus: 7_500,
    onboardingCompleted: true,
    expenses: {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent',
      monthlyHousingCost: 1_650,
      monthlyEssentialsExHousing: 1_000,
      monthlyDiscretionary: 1_600,
      nonMortgageDebts: [],
      emergencyCoverageMonths: 3,
      slushCoverageMonths: 3,
      bucketAssignedAccountIds: {
        retirement: [retirementAccount.id],
      },
    },
  };

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement: RetirementInputs = {
    ...DEFAULT_RETIREMENT_INPUTS,
    currentAge: 27,
    retirementAge: 65,
    desiredAnnualGrossIncome: householdGross,
    incomeReplacementPercent: 100,
    accounts: [retirementAccount],
  };

  const retirementForBucket = retirementInputsForBucket(
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
  const bucketEntries = getCoreBucketEntries(
    retirementForBucket,
    {},
    expenseTargets,
    profile
  );
  const excessLines = flattenBucketsForExcess(bucketEntries);
  const enoughScore = computeEnoughScoreFromBuckets(bucketEntries);
  const goalProgressRows = buildEnoughScoreGoalProgressRows(excessLines, enoughScore);
  const excessSummary = calculateExcessSummary(excessLines, {
    emergency: true,
    slush: true,
    retirement: true,
  });

  const emergency = bucketById(bucketEntries, 'emergency');
  const slush = bucketById(bucketEntries, 'slush');
  const retirementBucket = bucketById(bucketEntries, 'retirement');

  const progressBars = [
    {
      id: 'emergency',
      percent: progressPercent(emergency.current, emergency.target),
    },
    {
      id: 'slush',
      percent: progressPercent(slush.current, slush.target),
    },
    {
      id: 'retirement',
      percent: Math.round((retirementBucket.readinessProgress ?? 0) * 100),
    },
  ];

  return {
    profile,
    retirementForBucket,
    expenseTargets,
    bucketEntries,
    buckets: {
      emergency,
      slush,
      retirement: retirementBucket,
    },
    enoughScore,
    goalProgressRows,
    progressBars,
    excessSummary,
  };
}

describe('onboarding calculation flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('completes the age 27 renter scenario without invalid display values', () => {
    expect(() => buildOnboardingScenario()).not.toThrow();

    const scenario = buildOnboardingScenario();
    const { profile, buckets, enoughScore, goalProgressRows, progressBars, excessSummary } =
      scenario;

    expect(calculateAgeFromDateOfBirth(profile.dateOfBirth, AS_OF)).toBe(27);
    expect(buckets.emergency.target).toBe(7_950);
    expect(buckets.slush.target).toBe(12_750);
    expect(buckets.retirement.current).toBe(206_000);

    expect(progressBars).toHaveLength(3);
    expect(progressBars.map((bar) => bar.id)).toEqual(['emergency', 'slush', 'retirement']);
    progressBars.forEach((bar) => expectPercent(bar.percent, `${bar.id} progress bar`));

    expect(enoughScore.enoughScore).toBeGreaterThan(0);
    expectPercent(enoughScore.enoughScore, 'Enough Score');
    expect(goalProgressRows).toHaveLength(3);
    goalProgressRows.forEach((row) => {
      expect(row.percentLabel).toMatch(/^\d+%$/);
      expectPercent(Math.round(row.completion * 100), `${row.id} goal progress`);
    });

    expect(excessSummary.lines).toHaveLength(3);
    expect(excessSummary.totalExcess).toBeGreaterThanOrEqual(0);
    expect(excessSummary.lines.map((line) => line.id)).toEqual([
      'emergency',
      'slush',
      'retirement',
    ]);

    expectFiniteNumbers({
      expenseTargets: scenario.expenseTargets,
      buckets,
      enoughScore,
      goalProgressRows,
      progressBars,
      excessSummary,
    });
  });
});
