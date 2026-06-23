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
import { calculateExcessSummary, flattenBucketsForExcess } from '@/utils/bucket-excess';
import { formatCurrency } from '@/utils/format';
import { calculateAgeFromDateOfBirth, retirementInputsWithProfileAges } from '@/utils/profile-age';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { retirementInputsForBucket } from '@/utils/retirement-bucket-sync';

const AS_OF = new Date('2026-06-22T12:00:00Z');
const MAX_TOTAL_CALCULATION_MS = 750;
const MAX_STAGE_CALCULATION_MS = 250;
const BENCHMARK_ITERATIONS = 100;

type TimingRow = {
  stage: string;
  ms: number;
};

function timeStage<T>(timings: TimingRow[], stage: string, run: () => T): T {
  const start = nowMs();
  const result = run();
  timings.push({ stage, ms: nowMs() - start });
  return result;
}

function nowMs() {
  return vi.getRealSystemTime();
}

function benchmarkStage(timings: TimingRow[], stage: string, run: () => void) {
  const start = nowMs();
  for (let i = 0; i < BENCHMARK_ITERATIONS; i += 1) {
    run();
  }
  timings.push({
    stage: `${stage} (${BENCHMARK_ITERATIONS}x benchmark)`,
    ms: nowMs() - start,
  });
}

function expectNoInvalidValues(value: unknown, path = 'result') {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} should be finite`).toBe(true);
    expect(Math.abs(value), `${path} should stay below Number.MAX_SAFE_INTEGER`).toBeLessThan(
      Number.MAX_SAFE_INTEGER
    );
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

function buildLargeValueStressScenario() {
  const timings: TimingRow[] = [];
  const totalStart = nowMs();

  const emergencySavings = account('emergency-savings', 'Emergency Savings', 'savings', 1_000_000);
  const slushSavings = account('slush-savings', 'Slush Savings', 'savings', 1_000_000);
  const retirementSavings = account(
    'retirement-savings',
    'Retirement Savings',
    'retirement',
    50_000_000
  );
  const brokerage = account('brokerage', 'Brokerage', 'brokerage', 25_000_000);
  const accounts = [emergencySavings, slushSavings, retirementSavings, brokerage];

  const profile: ProfileInputs = {
    ...DEFAULT_PROFILE_INPUTS,
    userName: 'Stress User',
    planningMode: 'solo',
    dateOfBirth: '2008-06-22',
    userAge: 18,
    annualIncome: 1_000_000,
    baseAnnualSalary: 1_000_000,
    annualBonus: 0,
    onboardingCompleted: true,
    expenses: {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent',
      monthlyHousingCost: 12_000,
      monthlyEssentialsExHousing: 15_000,
      monthlyDiscretionary: 20_000,
      emergencyCoverageMonths: 24,
      slushCoverageMonths: 24,
      bucketAssignedAccountIds: {
        emergency: [emergencySavings.id],
        slush: [slushSavings.id],
        retirement: [retirementSavings.id, brokerage.id],
      },
    },
  };

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement: RetirementInputs = {
    ...DEFAULT_RETIREMENT_INPUTS,
    currentAge: 18,
    retirementAge: 100,
    desiredAnnualGrossIncome: householdGross,
    incomeReplacementPercent: 100,
    traditionalBalance: 75_000_000,
    rothBalance: 0,
    monthlyContributions: 0,
    socialSecurityMode: 'excluded',
    socialSecurityEstimate: 0,
    accounts,
  };

  const retirementForBucket = timeStage(timings, 'retirement input sync', () =>
    retirementInputsForBucket(
      retirementInputsWithProfileAges(
        applyIncomeReplacementToRetirement(retirement, householdGross),
        profile
      ),
      profile,
      householdGross,
      profile.expenses.bucketAssignedAccountIds.retirement
    )
  );

  const expenseTargets = timeStage(timings, 'expense target resolution', () =>
    resolvePartialExpenseBucketTargets(profile.expenses, 9_000, 1_500)
  );
  const bucketEntries = timeStage(timings, 'bucket construction', () =>
    getCoreBucketEntries(retirementForBucket, {}, expenseTargets, profile).map((entry) => {
      if (isBucketGroup(entry)) return entry;
      const assignedIds = profile.expenses.bucketAssignedAccountIds[entry.id];
      if (!assignedIds?.length || entry.id === 'retirement') return entry;
      const assignedAccounts = accounts.filter((a) => assignedIds.includes(a.id));
      return applyAssignedAccountsToBucket(entry, assignedAccounts, retirementForBucket, profile);
    })
  );
  const excessLines = timeStage(timings, 'excess line flattening', () =>
    flattenBucketsForExcess(bucketEntries)
  );
  const enoughScore = timeStage(timings, 'enough score calculation', () =>
    computeEnoughScoreFromBuckets(bucketEntries)
  );
  const goalProgressRows = timeStage(timings, 'dashboard progress rows', () =>
    buildEnoughScoreGoalProgressRows(excessLines, enoughScore)
  );
  const excessSummary = timeStage(timings, 'excess summary calculation', () =>
    calculateExcessSummary(excessLines, {
      emergency: true,
      slush: true,
      retirement: true,
    })
  );

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
  const formattedCurrency = {
    emergencyCurrent: formatCurrency(emergency.current),
    slushCurrent: formatCurrency(slush.current),
    retirementCurrent: formatCurrency(retirementBucket.current),
    totalExcess: formatCurrency(excessSummary.totalExcess),
  };
  const dashboardModel = {
    screen: 'Progress',
    enoughScore: enoughScore.enoughScore,
    totalBalance: excessSummary.lines.reduce((sum, line) => sum + line.current, 0),
    rows: goalProgressRows,
    charts: chartModels,
  };

  timings.push({ stage: 'total calculation flow', ms: nowMs() - totalStart });
  benchmarkStage(timings, 'bucket construction', () => {
    getCoreBucketEntries(retirementForBucket, {}, expenseTargets, profile);
  });
  benchmarkStage(timings, 'enough score calculation', () => {
    computeEnoughScoreFromBuckets(bucketEntries);
  });
  benchmarkStage(timings, 'dashboard progress rows', () => {
    buildEnoughScoreGoalProgressRows(excessLines, enoughScore);
  });

  return {
    profile,
    retirementForBucket,
    expenseTargets,
    bucketEntries,
    buckets: { emergency, slush, retirement: retirementBucket },
    enoughScore,
    goalProgressRows,
    excessSummary,
    progressBars,
    chartModels,
    formattedCurrency,
    dashboardModel,
    timings,
  };
}

describe('large financial values stress flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps large-value, long-horizon calculations finite, formatted, and performant', () => {
    expect(() => buildLargeValueStressScenario()).not.toThrow();

    const scenario = buildLargeValueStressScenario();
    const {
      profile,
      buckets,
      enoughScore,
      goalProgressRows,
      excessSummary,
      progressBars,
      chartModels,
      formattedCurrency,
      dashboardModel,
      timings,
    } = scenario;

    expect(calculateAgeFromDateOfBirth(profile.dateOfBirth, AS_OF)).toBe(18);
    expect(scenario.retirementForBucket.retirementAge).toBe(100);
    expect(buckets.emergency.current).toBe(1_000_000);
    expect(buckets.slush.current).toBe(1_000_000);
    expect(buckets.retirement.current).toBeGreaterThan(0);

    progressBars.forEach((bar) => expectPercent(bar.percent, `${bar.id} progress`));
    goalProgressRows.forEach((row) => {
      expect(row.percentLabel).toMatch(/^\d+%$/);
      expectPercent(Math.round(row.completion * 100), `${row.id} completion`);
    });
    expectPercent(enoughScore.enoughScore, 'Enough Score');

    chartModels.forEach((chart) => {
      expect(chart.progress, `${chart.id} should not visually overflow`).toBeLessThanOrEqual(1);
      expect(chart.progress, `${chart.id} should not be negative`).toBeGreaterThanOrEqual(0);
    });
    expect(dashboardModel.screen).toBe('Progress');
    expect(dashboardModel.rows).toHaveLength(3);
    expect(dashboardModel.charts).toHaveLength(4);

    expect(formattedCurrency.emergencyCurrent).toBe('$1,000,000');
    expect(formattedCurrency.slushCurrent).toBe('$1,000,000');
    expect(formattedCurrency.retirementCurrent).toMatch(/^\$\d{1,3}(,\d{3})*$/);
    expect(formattedCurrency.totalExcess).toMatch(/^\$\d{1,3}(,\d{3})*$/);
    expect(excessSummary.totalExcess).toBeGreaterThan(0);

    timings.forEach((row) => {
      expect(Number.isFinite(row.ms), `${row.stage} timing should be finite`).toBe(true);
      if (!row.stage.includes('benchmark') && row.stage !== 'total calculation flow') {
        expect(row.ms, `${row.stage} should stay below stage budget`).toBeLessThan(
          MAX_STAGE_CALCULATION_MS
        );
      }
    });
    const total = timings.find((row) => row.stage === 'total calculation flow');
    expect(total?.ms ?? Infinity).toBeLessThan(MAX_TOTAL_CALCULATION_MS);

    console.table(timings.map((row) => ({ stage: row.stage, ms: row.ms.toFixed(3) })));

    expectNoInvalidValues({
      expenseTargets: scenario.expenseTargets,
      buckets,
      enoughScore,
      goalProgressRows,
      excessSummary,
      progressBars,
      chartModels,
      formattedCurrency,
      dashboardModel,
    });
  });
});
