import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCoreBucketEntries,
  isBucketGroup,
  type BucketEntry,
  type BucketItem,
} from '@/constants/buckets';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import {
  DEFAULT_EXPENSE_INPUTS,
  DEFAULT_PROFILE_INPUTS,
  getHouseholdAnnualIncome,
  type ProfileInputs,
} from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, type RetirementInputs } from '@/constants/retirement';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
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

function expectNoInvalidValues(value: unknown, path = 'result') {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} should be finite`).toBe(true);
    return;
  }
  if (typeof value === 'string') {
    expect(value, `${path} should not include NaN`).not.toContain('NaN');
    expect(value, `${path} should not include Infinity`).not.toContain('Infinity');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => expectNoInvalidValues(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      expectNoInvalidValues(nested, `${path}.${key}`);
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

function account(
  id: string,
  name: string,
  accountType: FinancialAccount['accountType'],
  currentValue: number
): FinancialAccount {
  return {
    ...createEmptyFinancialAccount(accountType),
    id,
    name,
    currentValue,
    preTaxCurrentValue: accountType === 'retirement' ? currentValue : 0,
    rothCurrentValue: 0,
    estimatedAnnualSavings: 0,
    annualContributionDollars: 0,
  };
}

function buildOverfundedScenario() {
  const emergencySavings = account('emergency-savings', 'Emergency Savings', 'savings', 100_000);
  const slushSavings = account('slush-savings', 'Slush Savings', 'savings', 50_000);
  const retirementSavings = account(
    'retirement-savings',
    'Retirement Savings',
    'retirement',
    2_000_000
  );
  const accounts = [emergencySavings, slushSavings, retirementSavings];

  const profile: ProfileInputs = {
    ...DEFAULT_PROFILE_INPUTS,
    userName: 'Overfunded User',
    planningMode: 'solo',
    dateOfBirth: '1986-06-22',
    userAge: 40,
    annualIncome: 120_000,
    baseAnnualSalary: 120_000,
    annualBonus: 0,
    onboardingCompleted: true,
    expenses: {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent',
      monthlyHousingCost: 2_000,
      monthlyEssentialsExHousing: 2_000,
      monthlyDiscretionary: 1_000,
      emergencyCoverageMonths: 3,
      slushCoverageMonths: 3,
      bucketAssignedAccountIds: {
        emergency: [emergencySavings.id],
        slush: [slushSavings.id],
        retirement: [retirementSavings.id],
      },
    },
  };

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement: RetirementInputs = {
    ...DEFAULT_RETIREMENT_INPUTS,
    currentAge: 40,
    retirementAge: 65,
    desiredAnnualGrossIncome: householdGross,
    incomeReplacementPercent: 100,
    traditionalBalance: 2_000_000,
    rothBalance: 0,
    monthlyContributions: 0,
    accounts,
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
  ).map((entry) => {
    if (isBucketGroup(entry)) return entry;
    const assignedIds = profile.expenses.bucketAssignedAccountIds[entry.id];
    if (!assignedIds?.length || entry.id === 'retirement') return entry;
    const assignedAccounts = accounts.filter((a) => assignedIds.includes(a.id));
    return applyAssignedAccountsToBucket(entry, assignedAccounts, retirementForBucket, profile);
  });

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
    { id: 'emergency', percent: progressPercent(emergency.current, emergency.target) },
    { id: 'slush', percent: progressPercent(slush.current, slush.target) },
    { id: 'retirement', percent: Math.round((retirementBucket.readinessProgress ?? 0) * 100) },
  ];
  const chartModels = [
    { id: 'enough-score-ring', progress: enoughScore.enoughScore / 100 },
    ...progressBars.map((bar) => ({ id: `${bar.id}-progress-bar`, progress: bar.percent / 100 })),
  ];
  const dashboardModel = {
    screen: 'Progress',
    enoughScore: enoughScore.enoughScore,
    totalBalance: excessSummary.lines.reduce((sum, line) => sum + line.current, 0),
    rows: goalProgressRows,
    charts: chartModels,
  };

  return {
    accounts,
    profile,
    retirementForBucket,
    expenseTargets,
    bucketEntries,
    buckets: { emergency, slush, retirement: retirementBucket },
    enoughScore,
    goalProgressRows,
    progressBars,
    chartModels,
    dashboardModel,
    excessSummary,
  };
}

describe('overfunded calculation and screen flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caps all progress displays and computes non-negative excess correctly', () => {
    expect(() => buildOverfundedScenario()).not.toThrow();

    const scenario = buildOverfundedScenario();
    const {
      accounts,
      profile,
      buckets,
      enoughScore,
      goalProgressRows,
      progressBars,
      chartModels,
      dashboardModel,
      excessSummary,
    } = scenario;

    expect(calculateAgeFromDateOfBirth(profile.dateOfBirth, AS_OF)).toBe(40);
    expect(accounts.map((a) => a.currentValue)).toEqual([100_000, 50_000, 2_000_000]);
    expect(buckets.emergency.current).toBe(100_000);
    expect(buckets.slush.current).toBe(50_000);
    expect(buckets.retirement.current).toBe(2_000_000);

    progressBars.forEach((bar) => expectPercent(bar.percent, `${bar.id} progress`));
    expect(progressBars).toEqual([
      { id: 'emergency', percent: 100 },
      { id: 'slush', percent: 100 },
      { id: 'retirement', percent: 100 },
    ]);

    expect(enoughScore.enoughScore).toBe(100);
    expectPercent(enoughScore.enoughScore, 'Enough Score');
    goalProgressRows.forEach((row) => {
      expect(row.percentLabel).toBe('100%');
      expectPercent(Math.round(row.completion * 100), `${row.id} bucket completion`);
    });

    const expectedEmergencyExcess = buckets.emergency.current - buckets.emergency.target;
    const expectedSlushExcess = buckets.slush.current - buckets.slush.target;
    const expectedRetirementExcess = buckets.retirement.current - buckets.retirement.target;
    expect(excessSummary.lines.map((line) => line.excess)).toEqual([
      expectedEmergencyExcess,
      expectedSlushExcess,
      expectedRetirementExcess,
    ]);
    expect(excessSummary.lines.every((line) => line.excess >= 0)).toBe(true);
    expect(excessSummary.totalExcess).toBe(
      expectedEmergencyExcess + expectedSlushExcess + expectedRetirementExcess
    );

    expect(dashboardModel.screen).toBe('Progress');
    expect(dashboardModel.rows).toHaveLength(3);
    chartModels.forEach((chart) => {
      expect(chart.progress, `${chart.id} should not visually overflow`).toBeLessThanOrEqual(1);
      expect(chart.progress, `${chart.id} should not be negative`).toBeGreaterThanOrEqual(0);
    });

    expectNoInvalidValues({
      expenseTargets: scenario.expenseTargets,
      buckets,
      enoughScore,
      goalProgressRows,
      progressBars,
      chartModels,
      dashboardModel,
      excessSummary,
    });
  });
});
