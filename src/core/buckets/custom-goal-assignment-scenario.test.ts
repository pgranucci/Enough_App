/**
 * Custom goal + assigned savings — reference scenario for manual / cross-AI checks.
 *
 * Run: npx vitest run src/core/buckets/custom-goal-assignment-scenario.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOM_BUCKET_TEMPLATES,
  buildBucketFromTemplate,
} from '@/constants/custom-bucket-templates';
import { createEmptyFinancialAccount, type FinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, INVESTMENT_GROWTH_PRESET_RATE } from '@/constants/retirement';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import {
  formatEstimatedCompletionDate,
  formatGoalTimeline,
  formatPercent,
} from '@/utils/format';
import { monthsUntilGoalTarget } from '@/utils/goal-target-date';

describe('custom goal + savings assignment (reference scenario)', () => {
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
    const custom = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'custom')!;

    const wizardAnswers = {
      name: 'Kitchen Renovation',
      targetAmount: '35000',
      goalTargetMonth: '06/2029',
    };

    const bucket = buildBucketFromTemplate(custom, wizardAnswers, 'custom-kitchen-1');

    const savings: FinancialAccount = {
      ...createEmptyFinancialAccount('savings'),
      id: 'sav-kitchen-1',
      name: 'Renovation Savings',
      currentValue: 8_000,
      investmentMix: 'cash',
      estimatedAnnualSavings: 3_600,
    };

    const result = applyAssignedAccountsToBucket(bucket, [savings], retirement, profile);

    const progressPercent = formatPercent(result.current, result.target);

    const report = {
      scenarioAsOf: '2026-05-15',
      userFlow: {
        step1: 'Choose goal type: Custom',
        step2: 'Answer wizard questions',
        wizardAnswers,
        step3: 'Review & create bucket',
        step4: 'Assign Renovation Savings (HYSA) account to bucket',
      },
      inputs: {
        bucketName: wizardAnswers.name,
        targetAmountTodayDollars: 35_000,
        goalTargetMonth: '2029-06-01',
        assignedAccount: {
          type: 'savings',
          investmentMix: 'cash',
          currentValue: 8_000,
          estimatedAnnualSavings: 3_600,
        },
        profileAssumptions: {
          inflationAssumptionPercent: retirement.inflationAssumption,
          cashNominalReturnPercent: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
          note: 'Savings/cash assigned accounts use 0% nominal growth for completion projection',
        },
      },
      outputs: {
        targetAmount: result.target,
        goalDate: formatGoalTimeline(result.goalTargetMonth, result.goalHorizonYears),
        goalTargetMonthStored: result.goalTargetMonth,
        goalHorizonYears: result.goalHorizonYears,
        monthsUntilGoalDate: monthsUntilGoalTarget(result.goalTargetMonth!),
        currentAmount: result.current,
        monthlyContribution: result.monthlyContribution,
        progressPercent,
        estimatedCompletionDate: formatEstimatedCompletionDate(result.estimatedCompletionDate),
        yearsUntilTarget: result.yearsUntilTarget,
        projectedFutureValue: result.projectedFutureValue,
        sourceTemplateId: result.sourceTemplateId,
        wizardAnswersStored: result.wizardAnswers,
      },
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    expect(result.target).toBe(35_000);
    expect(result.current).toBe(8_000);
    expect(result.monthlyContribution).toBe(300);
    expect(result.goalTargetMonth).toBe('2029-06-01');
    expect(progressPercent).toBe(23);
    expect(result.estimatedCompletionDate).not.toBeNull();
  });
});
