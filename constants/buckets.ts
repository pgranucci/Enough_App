import type { ProfileInputs } from '@/constants/profile';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { DEFAULT_RETIREMENT_INPUTS, shortTermGrowthRate } from '@/constants/retirement';
import { calculateProjection } from '@/src/core/buckets/bucket-projection';
import { annualContributionForAccount } from '@/src/core/accounts/contributions';
import { projectGrossEquivalentPortfolioAtRetirement } from '@/utils/retirement-portfolio-projection';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { goalHorizonYearsFromTargetMonth } from '@/utils/goal-target-date';

export type BucketFields = {
  target: number;
  current: number;
  projectedFutureValue: number;
  projectedFutureValueReal: number;
  monthlyContribution: number;
  estimatedCompletionDate: string | null;
  annualGrowthRate: number;
  annualInflationRate: number;
  yearsUntilTarget: number;
  /** User-stated goal month (YYYY-MM-01), e.g. first tuition payment or purchase date. */
  goalTargetMonth?: string;
  /** Derived years until {@link goalTargetMonth}; kept for older buckets without a target month. */
  goalHorizonYears?: number;
  inflationAdjustedTarget?: number;
};

export type RetirementAccountType = 'traditional' | 'roth';

export type BucketItem = BucketFields & {
  id: string;
  name: string;
  accent: string;
  accountType?: RetirementAccountType;
  rothGrossEquivalent?: number;
  projectedGrossEquivalent?: number;
  /** Retirement only: projected gross-equivalent portfolio at retirement age (today's dollars). */
  projectedPortfolioAtRetirement?: number;
  /** Retirement only: progress ring uses this (projected ÷ target), not current ÷ target. */
  readinessProgress?: number;
  /** Retirement only: total annual contributions from assigned accounts (Profile → Accounts). */
  annualContributions?: number;
  /** Retirement only: monthly savings used in projection (employee + employer). */
  retirementMonthlyContributionEmployee?: number;
  retirementMonthlyContributionEmployer?: number;
  retirementProjectionReturnPercent?: number;
  /** Goal type chosen at creation — used to reopen the edit wizard. */
  sourceTemplateId?: string;
  /** Raw wizard answers from creation/edit — persisted for editing. */
  wizardAnswers?: Record<string, string>;
};

export type RetirementBucketSummary = {
  portfolioGrossEquivalent: number;
  effectiveRetirementPortfolio: number;
  nominalPortfolioTotal: number;
  traditionalBalance: number;
  rothBalance: number;
  rothGrossEquivalent: number;
  /** Nominal projected balances at retirement (pre–inflation adjustment to today’s dollars). */
  futureGrossEquivalentPortfolio: number;
  futureValueInvestments: number;
  /** Same projections expressed in today’s purchasing power (net of inflation). */
  futureGrossEquivalentPortfolioReal: number;
  futureValueInvestmentsReal: number;
  estimatedRetirementTaxRate: number;
  /** Roth share (0–1) used to blend the stated tax rate for gross-equivalent math. */
  rothBalanceShare: number;
  effectiveRetirementTaxRatePercent: number;
  estimatedCompletionDate: string;
};

export type BucketGroup = {
  id: string;
  name: string;
  accent: string;
  children: BucketItem[];
  retirementSummary?: RetirementBucketSummary;
};

export type BucketEntry = BucketItem | BucketGroup;

/** Core buckets that cannot be deleted from the Buckets screen. */
export const PROTECTED_BUCKET_IDS = new Set(['emergency', 'slush', 'retirement']);

export function isRemovableBucket(bucketId: string): boolean {
  return !PROTECTED_BUCKET_IDS.has(bucketId);
}

/** Custom savings goals use the same assigned-account math as Emergency and Slush. */
export function usesAssignedAccountGoalBucket(bucketId: string): boolean {
  return isCashReserveBucket(bucketId) || isRemovableBucket(bucketId);
}

/** New custom goal before accounts are linked — progress comes from assigned balances only. */
export function buildCustomGoalBucket(
  base: Pick<BucketItem, 'id' | 'name' | 'accent' | 'target'> & {
    goalTargetMonth?: string;
    goalHorizonYears?: number;
    sourceTemplateId?: string;
    wizardAnswers?: Record<string, string>;
  }
): BucketItem {
  const goalTargetMonth = base.goalTargetMonth?.trim() || undefined;
  const goalHorizonYears = goalTargetMonth
    ? goalHorizonYearsFromTargetMonth(goalTargetMonth)
    : Math.max(base.goalHorizonYears ?? 0, 0);

  return {
    id: base.id,
    name: base.name,
    accent: base.accent,
    target: Math.max(Math.round(base.target), 0),
    current: 0,
    monthlyContribution: 0,
    projectedFutureValue: 0,
    projectedFutureValueReal: 0,
    yearsUntilTarget: goalHorizonYears,
    goalTargetMonth,
    goalHorizonYears: goalHorizonYears > 0 ? goalHorizonYears : undefined,
    estimatedCompletionDate: null,
    annualGrowthRate: 0,
    annualInflationRate: 0,
    sourceTemplateId: base.sourceTemplateId,
    wizardAnswers: base.wizardAnswers,
  };
}

/** Core cash-reserve goals sized from expenses; targets are held in today's dollars. */
export const CASH_RESERVE_BUCKET_IDS = new Set(['emergency', 'slush']);

export function isCashReserveBucket(bucketId: string): boolean {
  return CASH_RESERVE_BUCKET_IDS.has(bucketId);
}

export function isBucketGroup(entry: BucketEntry): entry is BucketGroup {
  return 'children' in entry;
}

function getEffectiveCurrent(bucket: BucketItem) {
  return bucket.current;
}

/** Latest reachable completion among grouped buckets; null if none are reachable. */
function laterEstimatedCompletionDate(
  a: string | null,
  b: string | null
): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function getBucketFields(entry: BucketEntry): BucketFields {
  if (!isBucketGroup(entry)) {
    return entry;
  }

  return entry.children.reduce(
    (totals, child) => ({
      target: totals.target + child.target,
      current: totals.current + getEffectiveCurrent(child),
      projectedFutureValue:
        totals.projectedFutureValue +
        (child.projectedGrossEquivalent ?? child.projectedFutureValue),
      projectedFutureValueReal: totals.projectedFutureValueReal + child.projectedFutureValueReal,
      monthlyContribution: totals.monthlyContribution + child.monthlyContribution,
      annualGrowthRate: child.annualGrowthRate,
      annualInflationRate: child.annualInflationRate,
      yearsUntilTarget: Math.max(totals.yearsUntilTarget, child.yearsUntilTarget),
      inflationAdjustedTarget:
        (totals.inflationAdjustedTarget ?? 0) + (child.inflationAdjustedTarget ?? child.target),
      estimatedCompletionDate: laterEstimatedCompletionDate(
        totals.estimatedCompletionDate,
        child.estimatedCompletionDate
      ),
    }),
    {
      target: 0,
      current: 0,
      projectedFutureValue: 0,
      projectedFutureValueReal: 0,
      monthlyContribution: 0,
      annualGrowthRate: 7,
      annualInflationRate: 3,
      yearsUntilTarget: 0,
      inflationAdjustedTarget: 0,
      estimatedCompletionDate: entry.children[0]?.estimatedCompletionDate ?? null,
    }
  );
}

function createBucketWithProjection(
  base: Pick<BucketItem, 'id' | 'name' | 'accent' | 'target' | 'current' | 'monthlyContribution'> & {
    annualGrowthRate?: number;
    annualInflationRate?: number;
    useInflationAdjustedTarget?: boolean;
  }
): BucketItem {
  const annualGrowthRate = base.annualGrowthRate ?? 7;
  const annualInflationRate = base.annualInflationRate ?? 3;
  const useInflationAdjustedTarget =
    base.useInflationAdjustedTarget ?? !isCashReserveBucket(base.id);
  const projection = calculateProjection({
    currentBalance: base.current,
    monthlyContribution: base.monthlyContribution,
    annualGrowthRatePercent: annualGrowthRate,
    annualInflationRatePercent: annualInflationRate,
    yearsUntilTarget: 0,
    targetInTodayDollars: base.target,
    useInflationAdjustedTarget,
  });

  return {
    id: base.id,
    name: base.name,
    accent: base.accent,
    target: base.target,
    current: base.current,
    monthlyContribution: base.monthlyContribution,
    annualGrowthRate,
    annualInflationRate,
    yearsUntilTarget: projection.yearsUntilTarget,
    projectedFutureValue: projection.projectedFutureValue,
    projectedFutureValueReal: projection.projectedFutureValueReal,
    inflationAdjustedTarget: projection.inflationAdjustedTarget,
    estimatedCompletionDate: projection.estimatedCompletionDate,
  };
}

/** Rebuild projection fields with zero balance and contributions (no assigned accounts). */
export function bucketWithoutAssignedAccounts(bucket: BucketItem): BucketItem {
  if (isRemovableBucket(bucket.id)) {
    return buildCustomGoalBucket(bucket);
  }
  return createBucketWithProjection({
    id: bucket.id,
    name: bucket.name,
    accent: bucket.accent,
    target: bucket.target,
    current: 0,
    monthlyContribution: 0,
    annualGrowthRate: bucket.annualGrowthRate,
    annualInflationRate: bucket.annualInflationRate,
    useInflationAdjustedTarget: !isCashReserveBucket(bucket.id),
  });
}

export function buildRetirementBucket(
  inputs: RetirementInputs = DEFAULT_RETIREMENT_INPUTS,
  profile: ProfileInputs = DEFAULT_PROFILE_INPUTS
): BucketItem {
  const plan = calculateRetirementPlan(inputs, profile);
  /** Income-goal PV only — not affected by which accounts are assigned to this bucket. */
  const portfolioNeeded = plan.requiredPortfolioTarget;
  const grossTotal = plan.currentPortfolioGrossEquivalent;

  const projection = projectGrossEquivalentPortfolioAtRetirement(
    inputs.accounts,
    inputs,
    profile,
    plan.effectiveRetirementTaxRatePercentAtRetirement
  );
  const projectedPortfolioAtRetirement = projection.projectedNominal;
  const projectedGrossEquivalentAtRetirement = projection.projectedGrossEquivalent;
  const annualContributions = Math.round(
    inputs.accounts.reduce(
      (sum, account) => sum + annualContributionForAccount(account, profile),
      0
    )
  );

  const readinessProgress =
    portfolioNeeded > 0
      ? Math.min(1, projectedGrossEquivalentAtRetirement / portfolioNeeded)
      : 1;

  return {
    id: 'retirement',
    name: 'Retirement',
    accent: '#3B6FD4',
    target: portfolioNeeded,
    current: plan.currentPortfolioGrossEquivalent,
    monthlyContribution: Math.round(projection.monthlyContributionTotal),
    annualGrowthRate: projection.weightedAnnualReturnPercent,
    annualInflationRate: inputs.inflationAssumption,
    yearsUntilTarget: plan.yearsUntilRetirement,
    projectedFutureValue: projectedPortfolioAtRetirement,
    projectedFutureValueReal: projectedPortfolioAtRetirement,
    inflationAdjustedTarget: portfolioNeeded,
    estimatedCompletionDate: null,
    projectedPortfolioAtRetirement,
    projectedGrossEquivalent: projectedGrossEquivalentAtRetirement,
    readinessProgress,
    annualContributions,
    retirementMonthlyContributionEmployee: Math.round(projection.monthlyContributionEmployee),
    retirementMonthlyContributionEmployer: Math.round(projection.monthlyContributionEmployer),
    retirementProjectionReturnPercent: projection.weightedAnnualReturnPercent,
  };
}

/** @deprecated Use {@link buildRetirementBucket} */
export function buildRetirementBucketGroup(
  inputs: RetirementInputs = DEFAULT_RETIREMENT_INPUTS
): BucketGroup {
  const bucket = buildRetirementBucket(inputs);
  return {
    id: 'retirement',
    name: bucket.name,
    accent: bucket.accent,
    children: [bucket],
  };
}

const DEFAULT_CORE_ITEMS: Parameters<typeof createBucketWithProjection>[0][] = [
  {
    id: 'emergency',
    name: 'Emergency',
    accent: '#D97706',
    target: 9000,
    current: 0,
    monthlyContribution: 0,
  },
  {
    id: 'slush',
    name: 'Slush',
    accent: '#7C6FD4',
    target: 1500,
    current: 0,
    monthlyContribution: 0,
  },
];

export function getDefaultCoreBucketTarget(bucketId: string): number {
  const row = DEFAULT_CORE_ITEMS.find((b) => b.id === bucketId);
  return row?.target ?? 0;
}

export type ExpenseDerivedBucketTargets = {
  emergency: number;
  slush: number;
};

export function getCoreBucketEntries(
  retirementInputs: RetirementInputs = DEFAULT_RETIREMENT_INPUTS,
  coreOverrides: Record<string, BucketItem> = {},
  expenseTargets?: ExpenseDerivedBucketTargets | null,
  profile: ProfileInputs = DEFAULT_PROFILE_INPUTS
): BucketEntry[] {
  const cashGrowth = shortTermGrowthRate();
  const inflation = retirementInputs.inflationAssumption;

  const coreItems = DEFAULT_CORE_ITEMS.map((base) => {
    const override = coreOverrides[base.id];
    let target = override?.target ?? base.target;

    if (expenseTargets != null) {
      if (base.id === 'emergency') {
        target = expenseTargets.emergency;
      }
      if (base.id === 'slush') {
        target = expenseTargets.slush;
      }
    }

    return createBucketWithProjection({
      id: base.id,
      name: override?.name ?? base.name,
      accent: override?.accent ?? base.accent,
      target,
      current: 0,
      monthlyContribution: 0,
      annualGrowthRate: override?.annualGrowthRate ?? cashGrowth,
      annualInflationRate: override?.annualInflationRate ?? inflation,
      useInflationAdjustedTarget: !isCashReserveBucket(base.id),
    });
  });

  return [
    ...coreItems,
    buildRetirementBucket(retirementInputs, profile),
  ];
}

/** @deprecated Use getCoreBucketEntries() — kept for static fallbacks */
export const CORE_BUCKET_ENTRIES: BucketEntry[] = getCoreBucketEntries();
