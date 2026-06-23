import { describe, expect, it } from 'vitest';

import type { BucketItem } from '@/constants/buckets';
import {
  computeEnoughScore,
  computeEnoughScoreFromBuckets,
  type EnoughScoreInputs,
} from '@/src/core/enough-score/compute-enough-score';

describe('computeEnoughScore', () => {
  it('matches the documented weighted example (73)', () => {
    const result = computeEnoughScore({
      emergency: { currentAmount: 8000, targetAmount: 10_000 },
      slush: { currentAmount: 1500, targetAmount: 1500 },
      retirement: {
        estimatedPortfolio: 600_000,
        estimatedNeed: 1_000_000,
        readinessProgress: 0.6,
      },
      customGoals: [
        { id: 'car', name: 'Car Fund', currentAmount: 3000, targetAmount: 5000 },
        { id: 'vacation', name: 'Vacation', currentAmount: 1800, targetAmount: 3000 },
        { id: 'house', name: 'Home Down Payment', currentAmount: 12_000, targetAmount: 20_000 },
      ],
    });

    expect(result.emergencyCompletion).toBe(0.8);
    expect(result.retirementCompletion).toBe(0.6);
    expect(result.slushCompletion).toBe(1);
    expect(result.weightedContributions).toEqual({
      emergency: 28,
      retirement: 21,
      slush: 15,
      customGoals: 9,
    });
    expect(result.enoughScore).toBe(73);
    expect(result.customGoalBreakdown).toHaveLength(3);
    expect(result.customGoalBreakdown[0]).toMatchObject({
      name: 'Car Fund',
      completion: 0.6,
      weight: 5,
      contribution: 3,
    });
  });

  it('does not reward funding above target', () => {
    const result = computeEnoughScore({
      emergency: { currentAmount: 20_000, targetAmount: 10_000 },
      slush: { currentAmount: 0, targetAmount: 1000 },
      retirement: { estimatedPortfolio: 2_000_000, estimatedNeed: 1_000_000 },
      customGoals: [],
    });

    expect(result.emergencyCompletion).toBe(1);
    expect(result.weightedContributions.emergency).toBeCloseTo(100 * (35 / 85), 5);
  });

  it('splits 15 custom points evenly across custom goals', () => {
    const result = computeEnoughScore({
      emergency: { currentAmount: 0, targetAmount: 1 },
      slush: { currentAmount: 0, targetAmount: 1 },
      retirement: { estimatedPortfolio: 0, estimatedNeed: 1 },
      customGoals: [
        { id: 'a', name: 'A', currentAmount: 100, targetAmount: 100 },
        { id: 'b', name: 'B', currentAmount: 0, targetAmount: 100 },
      ],
    });

    expect(result.customGoalBreakdown[0].weight).toBe(7.5);
    expect(result.customGoalBreakdown[0].contribution).toBe(7.5);
    expect(result.customGoalBreakdown[1].contribution).toBe(0);
    expect(result.weightedContributions.customGoals).toBe(7.5);
  });

  it('clamps to minimum 1 and maximum 100', () => {
    const zeroed: EnoughScoreInputs = {
      emergency: { currentAmount: 0, targetAmount: 10_000 },
      slush: { currentAmount: 0, targetAmount: 1500 },
      retirement: { estimatedPortfolio: 0, estimatedNeed: 1_000_000 },
      customGoals: [],
    };
    expect(computeEnoughScore(zeroed).enoughScore).toBe(1);

    const maxed: EnoughScoreInputs = {
      emergency: { currentAmount: 10_000, targetAmount: 10_000 },
      slush: { currentAmount: 1500, targetAmount: 1500 },
      retirement: {
        estimatedPortfolio: 2_000_000,
        estimatedNeed: 1_000_000,
        readinessProgress: 1,
      },
      customGoals: [{ id: 'c', name: 'C', currentAmount: 5, targetAmount: 5 }],
    };
    expect(computeEnoughScore(maxed).enoughScore).toBe(100);
  });

  it('reaches 100 on core goals alone when no custom goals exist', () => {
    const result = computeEnoughScore({
      emergency: { currentAmount: 9000, targetAmount: 9000 },
      slush: { currentAmount: 1500, targetAmount: 1500 },
      retirement: {
        estimatedPortfolio: 1_500_000,
        estimatedNeed: 1_500_000,
        readinessProgress: 1,
      },
      customGoals: [],
    });

    expect(result.enoughScore).toBe(100);
    expect(result.weightedContributions.customGoals).toBe(0);
    expect(
      result.weightedContributions.emergency +
        result.weightedContributions.retirement +
        result.weightedContributions.slush
    ).toBe(100);
  });
});

describe('computeEnoughScoreFromBuckets', () => {
  it('uses retirement readiness from bucket entries', () => {
    const retirement: BucketItem = {
      id: 'retirement',
      name: 'Retirement',
      accent: '#3B6FD4',
      target: 1_000_000,
      current: 400_000,
      projectedGrossEquivalent: 700_000,
      readinessProgress: 0.7,
      monthlyContribution: 500,
      projectedFutureValue: 700_000,
      projectedFutureValueReal: 700_000,
      annualGrowthRate: 7,
      annualInflationRate: 2.5,
      yearsUntilTarget: 25,
      estimatedCompletionDate: null,
    };

    const result = computeEnoughScoreFromBuckets([
      {
        id: 'emergency',
        name: 'Emergency',
        accent: '#D97706',
        target: 10_000,
        current: 0,
        monthlyContribution: 0,
        projectedFutureValue: 0,
        projectedFutureValueReal: 0,
        annualGrowthRate: 0,
        annualInflationRate: 0,
        yearsUntilTarget: 0,
        estimatedCompletionDate: null,
      },
      {
        id: 'slush',
        name: 'Slush',
        accent: '#7C6FD4',
        target: 1500,
        current: 0,
        monthlyContribution: 0,
        projectedFutureValue: 0,
        projectedFutureValueReal: 0,
        annualGrowthRate: 0,
        annualInflationRate: 0,
        yearsUntilTarget: 0,
        estimatedCompletionDate: null,
      },
      retirement,
    ]);

    expect(result.retirementCompletion).toBe(0.7);
    expect(result.weightedContributions.retirement).toBeCloseTo(0.7 * 100 * (35 / 85), 5);
  });
});
