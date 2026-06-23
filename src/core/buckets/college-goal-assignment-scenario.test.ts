/**
 * College goal + assigned brokerage — reference scenario for manual / cross-AI checks.
 *
 * Run: npx vitest run src/core/buckets/college-goal-assignment-scenario.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CUSTOM_BUCKET_TEMPLATES } from '@/constants/custom-bucket-templates';
import { buildBucketFromTemplate } from '@/constants/custom-bucket-templates';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, INVESTMENT_GROWTH_PRESET_RATE } from '@/constants/retirement';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import { formatCurrency, formatEstimatedCompletionDate, formatGoalTimeline, formatPercent } from '@/utils/format';
import { realReturnPercent } from '@/src/core/shared/projection';

describe('college goal + brokerage assignment (reference scenario)', () => {
  const profile = DEFAULT_PROFILE_INPUTS;
  const retirement = {
    ...DEFAULT_RETIREMENT_INPUTS,
    inflationAssumption: 2.5,
    investmentGrowthMode: 'balanced' as const,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints metrics for cross-testing with another agent', () => {
    const college = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'college')!;

    const wizardAnswers = {
      annualCost: '40000',
      yearsOfCollege: '4',
      goalTargetMonth: '08/2034',
    };

    const bucket = buildBucketFromTemplate(college, wizardAnswers, 'college-scenario-1');

    const brokerage: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-college-1',
      name: 'College Brokerage',
      currentValue: 25_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 6_000,
    };

    const result = applyAssignedAccountsToBucket(bucket, [brokerage], retirement, profile);

    const progressPercent = formatPercent(result.current, result.target);
    const nominalBalanced = INVESTMENT_GROWTH_PRESET_RATE.balanced;
    const realGrowthPercent = realReturnPercent(nominalBalanced, retirement.inflationAssumption);

    const report = {
      scenarioAsOf: '2026-05-15',
      inputs: {
        annualCost: 40_000,
        yearsOfCollege: 4,
        goalTargetMonth: '2034-08-01',
        assignedAccount: {
          type: 'brokerage',
          investmentMix: 'balanced',
          currentValue: 25_000,
          estimatedAnnualSavings: 6_000,
        },
        profileAssumptions: {
          balancedNominalReturnPercent: nominalBalanced,
          inflationAssumptionPercent: retirement.inflationAssumption,
          realReturnUsedForProjectionPercent: realGrowthPercent,
        },
      },
      outputs: {
        targetAmount: result.target,
        goalDate: formatGoalTimeline(result.goalTargetMonth, result.goalHorizonYears),
        currentAmount: result.current,
        monthlyContribution: result.monthlyContribution,
        progressPercent,
        estimatedCompletionDate: formatEstimatedCompletionDate(result.estimatedCompletionDate),
        yearsUntilTarget: result.yearsUntilTarget,
      },
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    expect(result.target).toBe(160_000);
    expect(result.current).toBe(25_000);
    expect(result.monthlyContribution).toBe(500);
    expect(result.goalTargetMonth).toBe('2034-08-01');
    expect(progressPercent).toBe(16);
    expect(result.estimatedCompletionDate).not.toBeNull();
  });
});
