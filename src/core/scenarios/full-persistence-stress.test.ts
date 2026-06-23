import { describe, expect, it, vi } from 'vitest';

import { getCoreBucketEntries } from '@/constants/buckets';
import {
  DEFAULT_EXPENSE_INPUTS,
  DEFAULT_PROFILE_INPUTS,
  type ProfileInputs,
} from '@/constants/profile';
import { DEFAULT_RETIREMENT_INPUTS, type RetirementInputs } from '@/constants/retirement';
import {
  mapCustomBucketRows,
  profileRowToInputs,
  retirementRowToInputs,
} from '@/lib/supabase/mappers';
import { fetchUserData, UserDataLoadError } from '@/lib/supabase/user-data';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';
import { calculateExcessSummary, flattenBucketsForExcess } from '@/utils/bucket-excess';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import type {
  CustomBucketRow,
  ExcessPreferenceRow,
  ProfileRow,
  RetirementPlanRow,
} from '@/types/database';

const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  getSupabase: getSupabaseMock,
}));

function expectNoInvalidValues(value: unknown, path = 'result') {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} should be finite`).toBe(true);
    expect(value, `${path} should not be NaN`).not.toBe(Number.NaN);
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

function buildCalculationModels(profile: ProfileInputs, retirement: RetirementInputs) {
  const expenseTargets = resolvePartialExpenseBucketTargets(profile.expenses, 9_000, 1_500);
  const bucketEntries = getCoreBucketEntries(retirement, {}, expenseTargets, profile);
  const excessLines = flattenBucketsForExcess(bucketEntries);
  const enoughScore = computeEnoughScoreFromBuckets(bucketEntries);
  const excessSummary = calculateExcessSummary(excessLines, {
    emergency: true,
    slush: true,
    retirement: true,
  });
  const retirementPlan = calculateRetirementPlan(retirement, profile);
  return { expenseTargets, bucketEntries, enoughScore, excessSummary, retirementPlan };
}

function malformedProfileRow(): ProfileRow {
  return {
    user_id: 'user-stress',
    user_name: null,
    partner_name: null,
    date_of_birth: '',
    user_age: 'not-a-number' as unknown as number,
    filing_status: 'bad-status' as ProfileInputs['filingStatus'],
    state_of_residence: 'ZZ' as ProfileInputs['stateOfResidence'],
    planning_mode: 'bad-mode' as ProfileInputs['planningMode'],
    annual_income: Number.NaN,
    partner_annual_income: -50_000,
    partner_base_annual_salary: Number.POSITIVE_INFINITY,
    partner_annual_bonus: Number.NEGATIVE_INFINITY,
    partner_annual_commission: -1_000,
    partner_age: Number.NaN,
    partner_date_of_birth: 'not-a-date',
    onboarding_completed: false,
    income_entry_mode: 'hourly',
    base_annual_salary: Number.NaN,
    hourly_wage: Number.POSITIVE_INFINITY,
    average_weekly_hours: -40,
    annual_bonus: Number.NEGATIVE_INFINITY,
    annual_commission: -10_000,
    expenses_snapshot: {
      housingSituation: 'own',
      monthlyHousingCost: -2_500,
      monthlyEssentialsExHousing: Number.NaN,
      monthlyDiscretionary: Number.POSITIVE_INFINITY,
      emergencyCoverageMonths: Number.NaN,
      slushCoverageMonths: Number.NEGATIVE_INFINITY,
      mortgage: {
        hasMortgage: true,
        mortgagePaidOff: false,
        monthlyPayment: -3_000,
        maturityDate: 'bad-date',
      },
      nonMortgageDebts: [
        { id: 'debt', name: 'Bad debt', monthlyPayment: -500, maturityDate: '' },
      ],
      bucketAssignedAccountIds: { emergency: ['a', 'a', 12] },
    },
  };
}

function malformedRetirementRow(): RetirementPlanRow {
  return {
    user_id: 'user-stress',
    current_age: Number.POSITIVE_INFINITY,
    retirement_age: Number.NaN,
    desired_annual_gross_income: -120_000,
    social_security_estimate: Number.NaN,
    pension_estimate: Number.NEGATIVE_INFINITY,
    part_time_retirement_income: -10_000,
    traditional_balance: -500_000,
    roth_balance: Number.NaN,
    monthly_contributions: Number.POSITIVE_INFINITY,
    expected_annual_return: Number.NaN,
    inflation_assumption: Number.POSITIVE_INFINITY,
    estimated_retirement_tax_rate: -22,
    accounts_snapshot: [
      {
        id: 'bad-retirement',
        accountType: 'retirement',
        currentValue: -100_000,
        preTaxCurrentValue: Number.NaN,
        rothCurrentValue: Number.POSITIVE_INFINITY,
        estimatedAnnualSavings: -1,
        annualContributionDollars: Number.NaN,
        employeePreTaxContributionPercent: Number.POSITIVE_INFINITY,
      },
    ],
    retirement_extras: {
      partnerRetirementAge: Number.POSITIVE_INFINITY,
      socialSecurityClaimAge: Number.NaN,
      partnerSocialSecurityEstimate: Number.NEGATIVE_INFINITY,
      partnerSocialSecurityClaimAge: Number.POSITIVE_INFINITY,
      otherIncomeStreams: [
        {
          id: 'bad-income',
          name: 'Bad income',
          monthlyGross: -1_000,
          startAge: Number.NaN,
          endAge: Number.POSITIVE_INFINITY,
          assignedTo: 'partner',
        },
      ],
      lifeExpectancy: Number.NaN,
      partnerLifeExpectancy: Number.POSITIVE_INFINITY,
      incomeReplacementPercent: Number.NaN,
    },
  };
}

function queryResult<T>(result: T) {
  const promise = Promise.resolve(result) as Promise<T> & {
    maybeSingle: () => Promise<T>;
    order: () => Promise<T>;
  };
  promise.maybeSingle = () => Promise.resolve(result);
  promise.order = () => Promise.resolve(result);
  return promise;
}

function supabaseFromResults(results: Record<string, unknown>) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => queryResult(results[table]),
      }),
    }),
  };
}

describe('full persistence stress coverage', () => {
  it('normalizes empty, null, negative, infinite, and partial Supabase profile/retirement rows', () => {
    const profile = profileRowToInputs(malformedProfileRow());
    const retirement = retirementRowToInputs(malformedRetirementRow());

    expect(profile.filingStatus).toBe(DEFAULT_PROFILE_INPUTS.filingStatus);
    expect(profile.stateOfResidence).toBe(DEFAULT_PROFILE_INPUTS.stateOfResidence);
    expect(profile.annualIncome).toBe(0);
    expect(profile.partnerAnnualIncome).toBe(0);
    expect(profile.expenses.monthlyHousingCost).toBe(0);
    expect(profile.expenses.nonMortgageDebts[0]?.monthlyPayment).toBe(0);
    expect(retirement.traditionalBalance).toBe(0);
    expect(retirement.rothBalance).toBe(0);
    expect(retirement.monthlyContributions).toBe(0);
    expect(retirement.accounts[0]?.currentValue).toBe(0);
    expect(retirement.otherIncomeStreams[0]?.monthlyGross).toBe(0);
    expectNoInvalidValues({ profile, retirement });
    expectNoInvalidValues(buildCalculationModels(profile, retirement));
  });

  it('keeps zero balances and very large balances finite through calculations', () => {
    const zeroProfile = profileRowToInputs({
      ...malformedProfileRow(),
      date_of_birth: '2000-01-01',
      filing_status: 'single',
      state_of_residence: 'TX',
      annual_income: 0,
      expenses_snapshot: { ...DEFAULT_EXPENSE_INPUTS },
    });
    const zeroRetirement = retirementRowToInputs({
      ...malformedRetirementRow(),
      current_age: 25,
      retirement_age: 65,
      desired_annual_gross_income: 0,
      traditional_balance: 0,
      roth_balance: 0,
      monthly_contributions: 0,
      accounts_snapshot: [],
    });

    const largeProfile = { ...zeroProfile, annualIncome: 1_000_000_000, baseAnnualSalary: 1_000_000_000 };
    const largeRetirement = {
      ...zeroRetirement,
      desiredAnnualGrossIncome: 1_000_000_000,
      traditionalBalance: 10_000_000_000,
      rothBalance: 10_000_000_000,
    };

    expectNoInvalidValues(buildCalculationModels(zeroProfile, zeroRetirement));
    expectNoInvalidValues(buildCalculationModels(largeProfile, largeRetirement));
  });

  it('normalizes malformed custom bucket rows instead of crashing calculations', () => {
    const rows: CustomBucketRow[] = [
      {
        user_id: 'user-stress',
        bucket_id: 'custom-null',
        bucket: null as unknown as CustomBucketRow['bucket'],
        sort_order: Number.NaN,
      },
      {
        user_id: 'user-stress',
        bucket_id: 'custom-bad',
        bucket: {
          id: '',
          name: '',
          accent: '',
          target: Number.NaN,
          current: -1,
          projectedFutureValue: Number.POSITIVE_INFINITY,
          projectedFutureValueReal: Number.NEGATIVE_INFINITY,
          monthlyContribution: -100,
          estimatedCompletionDate: null,
          annualGrowthRate: Number.NaN,
          annualInflationRate: Number.POSITIVE_INFINITY,
          yearsUntilTarget: Number.NaN,
        },
        sort_order: Number.POSITIVE_INFINITY,
      },
    ];

    const buckets = mapCustomBucketRows(rows);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({
      id: 'custom-bad',
      name: 'Custom Goal',
      accent: '#7C6FD4',
      target: 0,
      current: 0,
      projectedFutureValue: 0,
      projectedFutureValueReal: 0,
      monthlyContribution: 0,
      yearsUntilTarget: 0,
    });
    expectNoInvalidValues(buckets);
  });

  it('classifies missing profile, failed Supabase responses, network interruptions, and partial records', async () => {
    getSupabaseMock.mockReturnValueOnce(
      supabaseFromResults({
        profiles: { data: null, error: null },
        retirement_plans: { data: null, error: null },
        core_buckets: { data: [], error: null },
        custom_buckets: { data: [], error: null },
        excess_preferences: { data: [], error: null },
      })
    );
    await expect(fetchUserData('missing-profile')).rejects.toMatchObject({
      kind: 'profile-not-found',
    });

    getSupabaseMock.mockReturnValueOnce(
      supabaseFromResults({
        profiles: { data: null, error: { message: 'permission denied' } },
        retirement_plans: { data: null, error: null },
        core_buckets: { data: [], error: null },
        custom_buckets: { data: [], error: null },
        excess_preferences: { data: [], error: null },
      })
    );
    await expect(fetchUserData('database-error')).rejects.toMatchObject({ kind: 'database' });

    getSupabaseMock.mockReturnValueOnce({
      from: (table: string) => ({
        select: () => ({
          eq: () => {
            if (table === 'profiles' || table === 'retirement_plans') {
              return {
                maybeSingle: () => Promise.reject(new TypeError('Failed to fetch')),
              };
            }
            if (table === 'custom_buckets') {
              return {
                order: () => Promise.reject(new TypeError('Failed to fetch')),
              };
            }
            return Promise.reject(new TypeError('Failed to fetch'));
          },
        }),
      }),
    });
    await expect(fetchUserData('network-error')).rejects.toMatchObject({ kind: 'network' });

    getSupabaseMock.mockReturnValueOnce(
      supabaseFromResults({
        profiles: { data: malformedProfileRow(), error: null },
        retirement_plans: { data: null, error: null },
        core_buckets: { data: [], error: null },
        custom_buckets: { data: [], error: null },
        excess_preferences: {
          data: [{ user_id: 'user-stress', bucket_id: 'emergency', included: true } satisfies ExcessPreferenceRow],
          error: null,
        },
      })
    );
    const partial = await fetchUserData('partial-record');
    expect(partial.profile.onboardingCompleted).toBe(false);
    expect(partial.retirement).toEqual(DEFAULT_RETIREMENT_INPUTS);
    expectNoInvalidValues(partial);
    expectNoInvalidValues(buildCalculationModels(partial.profile, partial.retirement));
  });

  it('uses typed load errors so callers can block onboarding redirects on failures', async () => {
    getSupabaseMock.mockReturnValueOnce(
      supabaseFromResults({
        profiles: { data: null, error: { message: 'database unavailable' } },
        retirement_plans: { data: null, error: null },
        core_buckets: { data: [], error: null },
        custom_buckets: { data: [], error: null },
        excess_preferences: { data: [], error: null },
      })
    );

    try {
      await fetchUserData('existing-user');
      throw new Error('fetchUserData should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(UserDataLoadError);
      expect(error).toMatchObject({ kind: 'database' });
    }
  });
});
