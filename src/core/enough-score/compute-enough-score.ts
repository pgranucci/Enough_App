import type { BucketEntry, BucketItem } from '@/constants/buckets';
import { isBucketGroup, isRemovableBucket } from '@/constants/buckets';
import { goalCompletion, retirementGoalCompletion } from '@/src/core/enough-score/goal-completion';

/** Fixed weights — score reflects stated goal completion, not wealth or advice quality. */
const EMERGENCY_WEIGHT = 35;
const RETIREMENT_WEIGHT = 35;
const SLUSH_WEIGHT = 15;
const CUSTOM_GOALS_TOTAL_WEIGHT = 15;
const CORE_GOALS_WEIGHT_TOTAL =
  EMERGENCY_WEIGHT + RETIREMENT_WEIGHT + SLUSH_WEIGHT;

const SCORE_MIN = 1;
const SCORE_MAX = 100;

/** When there are no custom goals, their 15% is split across core goals by existing ratios (35:35:15). */
function coreGoalWeights(hasCustomGoals: boolean) {
  const scale = hasCustomGoals ? 1 : 100 / CORE_GOALS_WEIGHT_TOTAL;
  return {
    emergency: EMERGENCY_WEIGHT * scale,
    retirement: RETIREMENT_WEIGHT * scale,
    slush: SLUSH_WEIGHT * scale,
  };
}

export type EnoughScoreCustomGoalBreakdown = {
  id: string;
  name: string;
  completion: number;
  weight: number;
  contribution: number;
};

export type EnoughScoreWeightedContributions = {
  emergency: number;
  retirement: number;
  slush: number;
  customGoals: number;
};

export type EnoughScoreResult = {
  enoughScore: number;
  emergencyCompletion: number;
  retirementCompletion: number;
  slushCompletion: number;
  weightedContributions: EnoughScoreWeightedContributions;
  customGoalBreakdown: EnoughScoreCustomGoalBreakdown[];
};

export type EnoughScoreGoalAmounts = {
  currentAmount: number;
  targetAmount: number;
};

export type EnoughScoreRetirementAmounts = {
  estimatedPortfolio: number;
  estimatedNeed: number;
  readinessProgress?: number;
};

export type EnoughScoreInputs = {
  emergency: EnoughScoreGoalAmounts;
  slush: EnoughScoreGoalAmounts;
  retirement: EnoughScoreRetirementAmounts;
  customGoals: (EnoughScoreGoalAmounts & { id: string; name: string })[];
};

function clampEnoughScore(raw: number): number {
  return Math.round(Math.min(Math.max(raw, SCORE_MIN), SCORE_MAX));
}

/**
 * Weighted Enough Score from normalized goal inputs.
 * Pure function — safe to call whenever balances or targets change.
 */
export function computeEnoughScore(inputs: EnoughScoreInputs): EnoughScoreResult {
  const emergencyCompletion = goalCompletion(
    inputs.emergency.currentAmount,
    inputs.emergency.targetAmount
  );
  const slushCompletion = goalCompletion(inputs.slush.currentAmount, inputs.slush.targetAmount);
  const retirementCompletion = retirementGoalCompletion(
    inputs.retirement.estimatedPortfolio,
    inputs.retirement.estimatedNeed,
    inputs.retirement.readinessProgress
  );

  const customCount = inputs.customGoals.length;
  const hasCustomGoals = customCount > 0;
  const weights = coreGoalWeights(hasCustomGoals);

  // Each pillar earns only its slice of the 100-point scale (always sums to 100 when fully complete).
  const emergencyContribution = emergencyCompletion * weights.emergency;
  const retirementContribution = retirementCompletion * weights.retirement;
  const slushContribution = slushCompletion * weights.slush;

  const customWeightEach = hasCustomGoals
    ? CUSTOM_GOALS_TOTAL_WEIGHT / customCount
    : 0;

  const customGoalBreakdown: EnoughScoreCustomGoalBreakdown[] = inputs.customGoals.map(
    (goal) => {
      const completion = goalCompletion(goal.currentAmount, goal.targetAmount);
      const contribution = completion * customWeightEach;
      return {
        id: goal.id,
        name: goal.name,
        completion,
        weight: customWeightEach,
        contribution,
      };
    }
  );

  const customGoalsContribution = customGoalBreakdown.reduce(
    (sum, row) => sum + row.contribution,
    0
  );

  const rawScore =
    emergencyContribution +
    retirementContribution +
    slushContribution +
    customGoalsContribution;

  return {
    enoughScore: clampEnoughScore(rawScore),
    emergencyCompletion,
    retirementCompletion,
    slushCompletion,
    weightedContributions: {
      emergency: emergencyContribution,
      retirement: retirementContribution,
      slush: slushContribution,
      customGoals: customGoalsContribution,
    },
    customGoalBreakdown,
  };
}

function collectBucketItems(entries: BucketEntry[]): BucketItem[] {
  const items: BucketItem[] = [];
  for (const entry of entries) {
    if (isBucketGroup(entry)) {
      items.push(...entry.children);
    } else {
      items.push(entry);
    }
  }
  return items;
}

function coreGoalAmounts(item: BucketItem | undefined): EnoughScoreGoalAmounts {
  return {
    currentAmount: item?.current ?? 0,
    targetAmount: item?.target ?? 0,
  };
}

function retirementAmountsFromBucket(item: BucketItem | undefined): EnoughScoreRetirementAmounts {
  const estimatedNeed = item?.target ?? 0;
  const estimatedPortfolio =
    item?.projectedGrossEquivalent ??
    item?.projectedPortfolioAtRetirement ??
    item?.current ??
    0;

  return {
    estimatedPortfolio,
    estimatedNeed,
    readinessProgress: item?.readinessProgress,
  };
}

/** Map live bucket entries (with assignments and retirement plan) into score inputs. */
export function computeEnoughScoreFromBuckets(entries: BucketEntry[]): EnoughScoreResult {
  const items = collectBucketItems(entries);
  const emergency = items.find((item) => item.id === 'emergency');
  const slush = items.find((item) => item.id === 'slush');
  const retirement = items.find((item) => item.id === 'retirement');

  const customGoals = items
    .filter((item) => isRemovableBucket(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      currentAmount: item.current,
      targetAmount: item.target,
    }));

  return computeEnoughScore({
    emergency: coreGoalAmounts(emergency),
    slush: coreGoalAmounts(slush),
    retirement: retirementAmountsFromBucket(retirement),
    customGoals,
  });
}
