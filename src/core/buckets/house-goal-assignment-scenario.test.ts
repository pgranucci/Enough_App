/**
 * House goal + assigned brokerage — reference scenario for manual / cross-AI checks.
 *
 * Run: npx vitest run src/core/buckets/house-goal-assignment-scenario.test.ts --reporter=verbose
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
import { formatEstimatedCompletionDate, formatGoalTimeline, formatPercent } from '@/utils/format';
import { monthsUntilGoalTarget } from '@/utils/goal-target-date';
import { realReturnPercent } from '@/src/core/shared/projection';

describe('house goal + brokerage assignment (reference scenario)', () => {
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
    const house = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'house')!;

    const wizardAnswers = {
      homePrice: '550000',
      downPaymentPercent: '20',
      closingCostsPercent: '3',
      goalTargetMonth: '04/2032',
    };

    const bucket = buildBucketFromTemplate(house, wizardAnswers, 'house-scenario-1');

    const brokerage: FinancialAccount = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-house-1',
      name: 'House Down Payment Fund',
      currentValue: 42_000,
      investmentMix: 'balanced',
      estimatedAnnualSavings: 9_600,
    };

    const result = applyAssignedAccountsToBucket(bucket, [brokerage], retirement, profile);

    const progressPercent = formatPercent(result.current, result.target);
    const nominalBalanced = INVESTMENT_GROWTH_PRESET_RATE.balanced;
    const realGrowthPercent = realReturnPercent(nominalBalanced, retirement.inflationAssumption);
    const homePrice = 550_000;
    const downPayment = homePrice * 0.2;
    const closingCosts = homePrice * 0.03;

    const report = {
      scenarioAsOf: '2026-05-15',
      userFlow: {
        step1: 'Choose goal type: House',
        step2: 'Answer wizard questions',
        wizardAnswers,
        targetFormula: 'homePrice × downPayment% + homePrice × closingCosts%',
        step3: 'Review & create bucket (name: House Fund)',
        step4: 'Assign House Down Payment Fund (brokerage) account to bucket',
      },
      inputs: {
        homePrice,
        downPaymentPercent: 20,
        closingCostsPercent: 3,
        downPaymentAmount: downPayment,
        closingCostsAmount: closingCosts,
        targetAmount: downPayment + closingCosts,
        goalTargetMonth: '2032-04-01',
        assignedAccount: {
          type: 'brokerage',
          investmentMix: 'balanced',
          currentValue: 42_000,
          estimatedAnnualSavings: 9_600,
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

    expect(result.target).toBe(126_500);
    expect(result.current).toBe(42_000);
    expect(result.monthlyContribution).toBe(800);
    expect(result.goalTargetMonth).toBe('2032-04-01');
    expect(progressPercent).toBe(33);
    expect(result.estimatedCompletionDate).not.toBeNull();
  });
});
