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
const NAVIGABLE_TABS = ['buckets', 'freedom', 'profile', 'settings'] as const;

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

function zeroAccount(
  id: string,
  name: string,
  accountType: FinancialAccount['accountType']
): FinancialAccount {
  return {
    ...createEmptyFinancialAccount(accountType),
    id,
    name,
    currentValue: 0,
    preTaxCurrentValue: 0,
    rothCurrentValue: 0,
    estimatedAnnualSavings: 0,
    annualContributionDollars: 0,
  };
}

function buildNoSavingsScenario() {
  const emergencySavings = zeroAccount('emergency-savings', 'Emergency Savings', 'savings');
  const slushSavings = zeroAccount('slush-savings', 'Slush Savings', 'savings');
  const retirementSavings = zeroAccount('retirement-savings', 'Retirement Savings', 'retirement');
  const brokerage = zeroAccount('brokerage', 'Brokerage', 'brokerage');
  const checking = zeroAccount('checking', 'Checking', 'savings');
  const savingsAccount = zeroAccount('savings-account', 'Savings Account', 'savings');
  const accounts = [
    emergencySavings,
    slushSavings,
    retirementSavings,
    brokerage,
    checking,
    savingsAccount,
  ];

  const profile: ProfileInputs = {
    ...DEFAULT_PROFILE_INPUTS,
    userName: 'No Savings User',
    planningMode: 'solo',
    dateOfBirth: '2000-06-23',
    userAge: 25,
    annualIncome: 50_000,
    baseAnnualSalary: 50_000,
    annualBonus: 0,
    onboardingCompleted: true,
    expenses: {
      ...DEFAULT_EXPENSE_INPUTS,
      bucketAssignedAccountIds: {
        emergency: [emergencySavings.id, checking.id],
        slush: [slushSavings.id, savingsAccount.id],
        retirement: [retirementSavings.id, brokerage.id],
      },
    },
  };

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement: RetirementInputs = {
    ...DEFAULT_RETIREMENT_INPUTS,
    currentAge: 25,
    retirementAge: 65,
    desiredAnnualGrossIncome: householdGross,
    incomeReplacementPercent: 100,
    traditionalBalance: 0,
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
    const assignedAccounts = accounts.filter((account) => assignedIds.includes(account.id));
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
  const screenModels = {
    index: dashboardModel,
    buckets: { bucketEntries, progressBars, chartModels },
    freedom: { excessSummary },
    profile: { profile },
    settings: { routeAvailable: true },
  };

  return {
    accounts,
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
    chartModels,
    dashboardModel,
    screenModels,
    excessSummary,
  };
}

describe('no-savings calculation and screen flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps dashboard, charts, navigation models, and calculations stable with zero savings', () => {
    expect(() => buildNoSavingsScenario()).not.toThrow();

    const scenario = buildNoSavingsScenario();
    const {
      accounts,
      profile,
      buckets,
      enoughScore,
      goalProgressRows,
      progressBars,
      chartModels,
      dashboardModel,
      screenModels,
      excessSummary,
    } = scenario;

    expect(calculateAgeFromDateOfBirth(profile.dateOfBirth, AS_OF)).toBe(25);
    expect(accounts.every((account) => account.currentValue === 0)).toBe(true);
    expect(buckets.emergency.current).toBe(0);
    expect(buckets.slush.current).toBe(0);
    expect(buckets.retirement.current).toBe(0);

    expect(progressBars).toEqual([
      { id: 'emergency', percent: 0 },
      { id: 'slush', percent: 0 },
      { id: 'retirement', percent: 0 },
    ]);
    progressBars.forEach((bar) => expectPercent(bar.percent, `${bar.id} progress`));

    expect(enoughScore.enoughScore).toBe(1);
    expectPercent(enoughScore.enoughScore, 'Enough Score');
    expect(goalProgressRows).toHaveLength(3);
    goalProgressRows.forEach((row) => {
      expect(row.percentLabel).toBe('0%');
      expectPercent(Math.round(row.completion * 100), `${row.id} goal progress`);
    });

    expect(excessSummary.totalExcess).toBe(0);
    expect(excessSummary.includedLines).toEqual([]);
    expect(excessSummary.lines.every((line) => line.excess === 0)).toBe(true);

    expect(dashboardModel.screen).toBe('Progress');
    expect(dashboardModel.totalBalance).toBe(0);
    expect(dashboardModel.rows).toHaveLength(3);
    expect(chartModels).toHaveLength(4);
    chartModels.forEach((chart) => {
      expectPercent(chart.progress * 100, chart.id);
    });

    expect(Object.keys(screenModels)).toEqual(['index', ...NAVIGABLE_TABS]);
    NAVIGABLE_TABS.forEach((tab) => {
      expect(screenModels[tab], `${tab} screen model should load`).toBeDefined();
    });

    expectNoInvalidValues({
      expenseTargets: scenario.expenseTargets,
      buckets,
      enoughScore,
      goalProgressRows,
      progressBars,
      chartModels,
      dashboardModel,
      screenModels,
      excessSummary,
    });
  });
});
