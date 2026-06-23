import { describe, expect, it } from 'vitest';

import {
  buildCustomGoalBucket,
  bucketWithoutAssignedAccounts,
  usesAssignedAccountGoalBucket,
} from '@/constants/buckets';
import { createEmptyFinancialAccount } from '@/constants/financial-accounts';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import {
  CUSTOM_BUCKET_TEMPLATES,
  buildBucketFromTemplate,
  getDefaultAnswers,
  getEditAnswersForBucket,
  getEditTemplateForBucket,
  mergeEditedCustomBucket,
} from '@/constants/custom-bucket-templates';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';

describe('custom goal buckets', () => {
  it('starts unassigned with zero progress inputs like emergency', () => {
    const bucket = buildCustomGoalBucket({
      id: 'custom-1',
      name: 'House Fund',
      accent: '#F59E0B',
      target: 50_000,
    });

    expect(bucket.current).toBe(0);
    expect(bucket.monthlyContribution).toBe(0);
    expect(bucket.projectedFutureValue).toBe(0);
    expect(bucket.estimatedCompletionDate).toBeNull();
    expect(usesAssignedAccountGoalBucket(bucket.id)).toBe(true);
  });

  it('template build omits growth and inflation assumptions', () => {
    const customTemplate = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'custom')!;
    const bucket = buildBucketFromTemplate(
      customTemplate,
      { name: 'Trip', targetAmount: '5000', goalTargetMonth: '05/2028' },
      'custom-trip'
    );

    expect(bucket.target).toBe(5000);
    expect(bucket.goalTargetMonth).toBe('2028-05-01');
    expect(bucket.sourceTemplateId).toBe('custom');
    expect(bucket.wizardAnswers?.name).toBe('Trip');
    expect(bucket.goalHorizonYears).toBeGreaterThan(0);
    expect(bucket.current).toBe(0);
    expect(bucket.annualGrowthRate).toBe(0);
    expect(bucket.annualInflationRate).toBe(0);
  });

  it('college template captures first tuition month and year', () => {
    const college = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'college')!;
    const answers = {
      annualCost: '40000',
      yearsOfCollege: '4',
      goalTargetMonth: '08/2034',
    };
    const bucket = buildBucketFromTemplate(college, answers, 'college-1');

    expect(bucket.target).toBe(160_000);
    expect(bucket.goalTargetMonth).toBe('2034-08-01');
    expect(bucket.sourceTemplateId).toBe('college');
    expect(bucket.wizardAnswers).toEqual(answers);
    expect(bucket.goalHorizonYears).toBeGreaterThan(0);
  });

  it('mergeEditedCustomBucket preserves id and updates saved fields', () => {
    const college = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'college')!;
    const existing = buildBucketFromTemplate(
      college,
      {
        annualCost: '30000',
        yearsOfCollege: '4',
        goalTargetMonth: '08/2030',
      },
      'college-edit'
    );
    existing.current = 5000;

    const nextAnswers = {
      annualCost: '45000',
      yearsOfCollege: '4',
      goalTargetMonth: '05/2032',
    };
    const built = buildBucketFromTemplate(college, nextAnswers, existing.id);
    const merged = mergeEditedCustomBucket(existing, built, college.id, nextAnswers);

    expect(merged.id).toBe('college-edit');
    expect(merged.current).toBe(5000);
    expect(merged.target).toBe(180_000);
    expect(merged.goalTargetMonth).toBe('2032-05-01');
    expect(merged.wizardAnswers).toEqual(nextAnswers);
  });

  it('getEditAnswersForBucket restores stored wizard answers', () => {
    const college = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'college')!;
    const bucket = buildBucketFromTemplate(
      college,
      {
        annualCost: '40000',
        yearsOfCollege: '4',
        goalTargetMonth: '08/2034',
      },
      'college-1'
    );

    const answers = getEditAnswersForBucket(bucket, college);
    expect(answers.annualCost).toBe('40,000');
    expect(answers.goalTargetMonth).toBe('08/2034');
  });

  it('getEditTemplateForBucket falls back to custom for legacy buckets', () => {
    const legacy = buildCustomGoalBucket({
      id: 'custom-legacy',
      name: 'Legacy Goal',
      accent: '#111111',
      target: 12_000,
      goalTargetMonth: '2030-01-01',
    });

    expect(getEditTemplateForBucket(legacy).id).toBe('custom');
    const answers = getEditAnswersForBucket(legacy, getEditTemplateForBucket(legacy));
    expect(answers.name).toBe('Legacy Goal');
    expect(answers.targetAmount).toBe('12,000');
    expect(answers.goalTargetMonth).toBe('01/2030');
  });

  it('uses assigned-account completion when accounts are linked', () => {
    const brokerage = {
      ...createEmptyFinancialAccount('brokerage'),
      id: 'brk-custom',
      currentValue: 10_000,
      investmentMix: 'balanced' as const,
      estimatedAnnualSavings: 3_600,
    };
    const bucket = buildCustomGoalBucket({
      id: 'custom-house',
      name: 'House Fund',
      accent: '#F59E0B',
      target: 30_000,
    });

    const result = applyAssignedAccountsToBucket(
      bucket,
      [brokerage],
      { ...DEFAULT_RETIREMENT_INPUTS, inflationAssumption: 2.5, investmentGrowthMode: 'balanced' },
      DEFAULT_PROFILE_INPUTS
    );

    expect(result.current).toBe(10_000);
    expect(result.monthlyContribution).toBe(300);
    expect(result.estimatedCompletionDate).not.toBeNull();
    expect(result.yearsUntilTarget).toBeGreaterThan(0);
  });

  it('resets to unassigned state when accounts are cleared', () => {
    const assigned = buildCustomGoalBucket({
      id: 'vacation',
      name: 'Vacation',
      accent: '#EC4899',
      target: 3_000,
    });
    assigned.current = 2_000;
    assigned.monthlyContribution = 100;

    const reset = bucketWithoutAssignedAccounts(assigned);
    expect(reset.current).toBe(0);
    expect(reset.monthlyContribution).toBe(0);
    expect(reset.projectedFutureValue).toBe(0);
  });

  it('keeps template metadata when resetting unassigned custom goals', () => {
    const college = CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === 'college')!;
    const bucket = buildBucketFromTemplate(
      college,
      getDefaultAnswers(college),
      'custom-college-1'
    );
    bucket.current = 5_000;
    bucket.monthlyContribution = 200;

    const reset = bucketWithoutAssignedAccounts(bucket);
    expect(reset.sourceTemplateId).toBe('college');
    expect(reset.wizardAnswers).toEqual(bucket.wizardAnswers);
  });
});
