import { describe, expect, it } from 'vitest';

import { getCoreBucketEntries, isBucketGroup } from '@/constants/buckets';
import {
  DEFAULT_EXPENSE_INPUTS,
  DEFAULT_PROFILE_INPUTS,
  normalizeExpenseInputs,
  type ProfileInputs,
} from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, type RetirementInputs } from '@/constants/retirement';
import {
  DEFAULT_ONBOARDING_DATA,
  getOnboardingSteps,
  type OnboardingData,
  type OnboardingStepId,
} from '@/constants/onboarding';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import { buildEnoughScoreGoalProgressRows } from '@/src/core/enough-score/enough-score-goal-progress';
import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';
import { calculateExcessSummary, flattenBucketsForExcess } from '@/utils/bucket-excess';
import {
  ONBOARDING_REQUIRED_STEP_MESSAGE,
  onboardingMoneyValue,
  validateOnboardingStep,
} from '@/utils/onboarding-validation';
import { calculateRetirementPlan } from '@/utils/retirement-planning';

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

function expectBlocked(data: OnboardingData, step: OnboardingStepId) {
  const validation = validateOnboardingStep(data, step, AS_OF);
  expect(validation.canContinue).toBe(false);
  expect(validation.feedbackMessage).toBe(ONBOARDING_REQUIRED_STEP_MESSAGE);
}

function buildCalculationModels(profile: ProfileInputs, retirement: RetirementInputs) {
  const expenseTargets = resolvePartialExpenseBucketTargets(profile.expenses, 9_000, 1_500);
  const bucketEntries = getCoreBucketEntries(retirement, {}, expenseTargets, profile);
  const excessLines = flattenBucketsForExcess(bucketEntries);
  const enoughScore = computeEnoughScoreFromBuckets(bucketEntries);
  const goalProgressRows = buildEnoughScoreGoalProgressRows(excessLines, enoughScore);
  const excessSummary = calculateExcessSummary(excessLines, {
    emergency: true,
    slush: true,
    retirement: true,
  });
  const retirementPlan = calculateRetirementPlan(retirement, profile);

  return {
    expenseTargets,
    bucketEntries,
    enoughScore,
    goalProgressRows,
    excessSummary,
    retirementPlan,
    visibleBucketCount: bucketEntries.filter((entry) => !isBucketGroup(entry)).length,
  };
}

describe('invalid and unusual input validation', () => {
  it('covers all currently implemented onboarding required-step validation messages', () => {
    expect(getOnboardingSteps(null)).toEqual(['name', 'age', 'planningMode', 'income', 'filingStatus']);

    expectBlocked(DEFAULT_ONBOARDING_DATA, 'name');
    expectBlocked({ ...DEFAULT_ONBOARDING_DATA, userName: 'Alex' }, 'age');
    expectBlocked(
      { ...DEFAULT_ONBOARDING_DATA, userName: 'Alex', userDateOfBirth: '01/01/2000' },
      'planningMode'
    );
    expectBlocked(
      {
        ...DEFAULT_ONBOARDING_DATA,
        planningMode: 'partner',
        partnerName: '',
        partnerDateOfBirth: '',
      },
      'partnerDetails'
    );
    expectBlocked(
      {
        ...DEFAULT_ONBOARDING_DATA,
        planningMode: 'solo',
        userDateOfBirth: '01/01/2000',
        baseAnnualSalary: '0',
      },
      'income'
    );
    expectBlocked(
      {
        ...DEFAULT_ONBOARDING_DATA,
        planningMode: 'solo',
        userDateOfBirth: '01/01/2000',
        baseAnnualSalary: '50,000',
        filingStatus: null,
      },
      'filingStatus'
    );
  });

  it('scenario A blocks zero income and keeps zero rent/spending calculations stable', () => {
    const data: OnboardingData = {
      ...DEFAULT_ONBOARDING_DATA,
      userName: 'Zero Input User',
      userDateOfBirth: '01/01/2000',
      planningMode: 'solo',
      baseAnnualSalary: '0',
      filingStatus: 'single',
    };
    expectBlocked(data, 'income');

    const profile: ProfileInputs = {
      ...DEFAULT_PROFILE_INPUTS,
      annualIncome: 0,
      baseAnnualSalary: 0,
      expenses: {
        ...DEFAULT_EXPENSE_INPUTS,
        monthlyHousingCost: 0,
        monthlyEssentialsExHousing: 0,
        monthlyDiscretionary: 0,
      },
    };
    const retirement: RetirementInputs = {
      ...DEFAULT_RETIREMENT_INPUTS,
      currentAge: 25,
      desiredAnnualGrossIncome: 0,
      incomeReplacementPercent: 100,
      accounts: [],
    };

    const models = buildCalculationModels(profile, retirement);
    expect(models.expenseTargets).toEqual({ emergency: 9_000, slush: 1_500 });
    expect(models.visibleBucketCount).toBe(3);
    expectNoInvalidValues(models);
  });

  it('scenario B keeps retirement stable when current age equals retirement age', () => {
    const profile: ProfileInputs = {
      ...DEFAULT_PROFILE_INPUTS,
      dateOfBirth: '2008-06-22',
      userAge: 18,
      annualIncome: 50_000,
      baseAnnualSalary: 50_000,
    };
    const retirement: RetirementInputs = {
      ...DEFAULT_RETIREMENT_INPUTS,
      currentAge: 18,
      retirementAge: 18,
      desiredAnnualGrossIncome: 50_000,
      incomeReplacementPercent: 100,
      accounts: [],
    };

    const models = buildCalculationModels(profile, retirement);
    expect(models.retirementPlan.yearsUntilRetirement).toBe(0);
    expect(models.retirementPlan.projectedReadinessPercent).toBeGreaterThanOrEqual(0);
    expect(models.retirementPlan.projectedReadinessPercent).toBeLessThanOrEqual(100);
    expectNoInvalidValues(models);
  });

  it('scenario C prevents negative income from being saved as a negative number through onboarding parsing', () => {
    expect(onboardingMoneyValue('-1000')).toBe(1000);

    const validation = validateOnboardingStep(
      {
        ...DEFAULT_ONBOARDING_DATA,
        planningMode: 'solo',
        userDateOfBirth: '01/01/2000',
        baseAnnualSalary: '-1000',
      },
      'income',
      AS_OF
    );
    expect(validation.canContinue).toBe(true);
    expect(validation.userBase).toBe(1000);
    expect(validation.feedbackMessage).toBeNull();

    const profile: ProfileInputs = {
      ...DEFAULT_PROFILE_INPUTS,
      annualIncome: -1000,
      baseAnnualSalary: -1000,
    };
    const retirement: RetirementInputs = {
      ...DEFAULT_RETIREMENT_INPUTS,
      currentAge: 25,
      desiredAnnualGrossIncome: Math.max(profile.annualIncome, 0),
      accounts: [],
    };
    expectNoInvalidValues(buildCalculationModels(profile, retirement));
  });

  it('scenario D normalizes negative rent to zero before bucket calculations', () => {
    const expenses = normalizeExpenseInputs({
      ...DEFAULT_EXPENSE_INPUTS,
      monthlyHousingCost: -500,
      monthlyEssentialsExHousing: 1000,
      monthlyDiscretionary: 500,
    });
    expect(expenses.monthlyHousingCost).toBe(0);

    const profile: ProfileInputs = {
      ...DEFAULT_PROFILE_INPUTS,
      annualIncome: 50_000,
      expenses,
    };
    const retirement: RetirementInputs = {
      ...DEFAULT_RETIREMENT_INPUTS,
      currentAge: 25,
      desiredAnnualGrossIncome: 50_000,
      accounts: [],
    };
    const models = buildCalculationModels(profile, retirement);
    expect(models.expenseTargets.emergency).toBe(6_000);
    expect(models.expenseTargets.slush).toBe(4_500);
    expectNoInvalidValues(models);
  });

  it('scenario E blocks empty required fields and gives clear feedback instead of saving', () => {
    const steps = getOnboardingSteps(DEFAULT_ONBOARDING_DATA.planningMode);
    steps.forEach((step) => expectBlocked(DEFAULT_ONBOARDING_DATA, step));
  });
});
