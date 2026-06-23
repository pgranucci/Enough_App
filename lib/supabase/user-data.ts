import type { BucketItem } from '@/constants/buckets';
import type { ProfileInputs } from '@/constants/profile';
import { DEFAULT_PROFILE_INPUTS } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import type { USStateCode } from '@/constants/us-states';
import { getSupabase } from '@/lib/supabase';
import type { IncomeEntryInput } from '@/utils/income';
import { computeTotalAnnualGross } from '@/utils/income';
import { clampAge } from '@/utils/profile-age';
import { calculateAgeFromDateOfBirth } from '@/utils/profile-tax';
import {
  mapCustomBucketRows,
  mapExcessPreferences,
  profileInputsToRow,
  profileRowToInputs,
  retirementInputsToRow,
  retirementRowToInputs,
} from '@/lib/supabase/mappers';
import type { CoreBucketRow, UserDataSnapshot } from '@/types/database';

/** Auto-seeded placeholders from an earlier app version — not user-created goals. */
const LEGACY_SEEDED_CUSTOM_BUCKET_IDS = new Set(['vacation', 'car']);

export type UserDataLoadErrorKind = 'profile-not-found' | 'network' | 'database';

export class UserDataLoadError extends Error {
  kind: UserDataLoadErrorKind;
  cause?: unknown;

  constructor(kind: UserDataLoadErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'UserDataLoadError';
    this.kind = kind;
    this.cause = cause;
  }
}

function isNetworkLikeError(error: unknown) {
  if (error instanceof TypeError) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error != null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';
  return /abort|failed to fetch|network|timeout|offline/i.test(message);
}

function toUserDataLoadError(error: unknown, fallbackMessage: string): UserDataLoadError {
  if (error instanceof UserDataLoadError) return error;
  if (isNetworkLikeError(error)) {
    return new UserDataLoadError('network', 'Unable to reach the server. Check your connection and try again.', error);
  }
  return new UserDataLoadError('database', fallbackMessage, error);
}

export async function fetchUserData(userId: string): Promise<UserDataSnapshot> {
  const supabase = getSupabase();

  const [profileRes, retirementRes, coreRes, customRes, excessRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('retirement_plans').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('core_buckets').select('*').eq('user_id', userId),
    supabase.from('custom_buckets').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('excess_preferences').select('*').eq('user_id', userId),
  ]).catch((error) => {
    throw toUserDataLoadError(error, 'Unable to load your profile data.');
  });

  if (profileRes.error) {
    throw toUserDataLoadError(profileRes.error, 'Unable to load your profile.');
  }
  if (!profileRes.data) {
    throw new UserDataLoadError('profile-not-found', 'No profile exists for this user yet.');
  }
  if (retirementRes.error) {
    throw toUserDataLoadError(retirementRes.error, 'Unable to load your retirement plan.');
  }
  if (coreRes.error) {
    throw toUserDataLoadError(coreRes.error, 'Unable to load your bucket targets.');
  }
  if (customRes.error) {
    throw toUserDataLoadError(customRes.error, 'Unable to load your custom buckets.');
  }
  if (excessRes.error) {
    throw toUserDataLoadError(excessRes.error, 'Unable to load your excess preferences.');
  }

  const coreBucketOverrides: Record<string, BucketItem> = {};
  for (const row of (coreRes.data ?? []) as CoreBucketRow[]) {
    coreBucketOverrides[row.bucket_id] = row.bucket;
  }

  let customBuckets = mapCustomBucketRows(customRes.data);
  customBuckets = await stripLegacySeededCustomBuckets(userId, customBuckets);

  return {
    profile: profileRowToInputs(profileRes.data),
    retirement: retirementRowToInputs(retirementRes.data),
    coreBucketOverrides,
    customBuckets,
    excessIncluded: mapExcessPreferences(excessRes.data),
  };
}

export async function ensureUserRows(userId: string) {
  const supabase = getSupabase();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw toUserDataLoadError(profileError, 'Unable to verify your profile.');
  }

  if (!profile) {
    const { error } = await supabase
      .from('profiles')
      .insert({ user_id: userId, onboarding_completed: false });
    if (error) {
      throw toUserDataLoadError(error, 'Unable to create your profile.');
    }
  }

  const { data: retirement, error: retirementError } = await supabase
    .from('retirement_plans')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (retirementError) {
    throw toUserDataLoadError(retirementError, 'Unable to verify your retirement plan.');
  }

  if (!retirement) {
    const { data: profileRow, error: profileRowError } = await supabase
      .from('profiles')
      .select('state_of_residence, filing_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileRowError) {
      throw toUserDataLoadError(profileRowError, 'Unable to load your profile defaults.');
    }

    const initialRetirement: RetirementInputs = {
      ...DEFAULT_RETIREMENT_INPUTS,
      retirementStateOfResidence:
        (profileRow?.state_of_residence as USStateCode | undefined) ??
        DEFAULT_RETIREMENT_INPUTS.retirementStateOfResidence,
      retirementFilingStatus:
        (profileRow?.filing_status as ProfileInputs['filingStatus'] | undefined) ??
        DEFAULT_RETIREMENT_INPUTS.retirementFilingStatus,
    };

    const { error } = await supabase
      .from('retirement_plans')
      .insert(retirementInputsToRow(userId, initialRetirement));
    if (error) {
      throw toUserDataLoadError(error, 'Unable to create your retirement plan.');
    }
  }
}

async function stripLegacySeededCustomBuckets(
  userId: string,
  buckets: BucketItem[]
): Promise<BucketItem[]> {
  const legacy = buckets.filter((bucket) => LEGACY_SEEDED_CUSTOM_BUCKET_IDS.has(bucket.id));
  if (legacy.length === 0) return buckets;

  await Promise.all(legacy.map((bucket) => deleteCustomBucket(userId, bucket.id)));
  return buckets.filter((bucket) => !LEGACY_SEEDED_CUSTOM_BUCKET_IDS.has(bucket.id));
}

export async function saveProfile(userId: string, profile: ProfileInputs) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .upsert(profileInputsToRow(userId, profile), {
      onConflict: 'user_id',
      defaultToNull: false,
    });
  if (error) throw error;
}

export async function saveRetirementPlan(userId: string, retirement: RetirementInputs) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('retirement_plans')
    .upsert(retirementInputsToRow(userId, retirement), { onConflict: 'user_id' });
  if (error) throw error;
}

export async function saveCustomBucket(userId: string, bucket: BucketItem, sortOrder: number) {
  const supabase = getSupabase();
  const { error } = await supabase.from('custom_buckets').upsert(
    {
      user_id: userId,
      bucket_id: bucket.id,
      bucket,
      sort_order: sortOrder,
    },
    { onConflict: 'user_id,bucket_id' }
  );
  if (error) throw error;
}

export async function deleteCustomBucket(userId: string, bucketId: string) {
  const supabase = getSupabase();
  const { error: bucketError } = await supabase
    .from('custom_buckets')
    .delete()
    .eq('user_id', userId)
    .eq('bucket_id', bucketId);
  if (bucketError) throw bucketError;

  const { error: excessError } = await supabase
    .from('excess_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('bucket_id', bucketId);
  if (excessError) throw excessError;
}

export async function saveExcessPreference(userId: string, bucketId: string, included: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase.from('excess_preferences').upsert(
    { user_id: userId, bucket_id: bucketId, included },
    { onConflict: 'user_id,bucket_id' }
  );
  if (error) throw error;
}

export type OnboardingPersonalPayload = {
  dateOfBirth: string;
  filingStatus: ProfileInputs['filingStatus'];
  stateOfResidence: USStateCode;
};

export async function completeOnboarding(
  userId: string,
  personal: OnboardingPersonalPayload,
  income: IncomeEntryInput
) {
  const gross = computeTotalAnnualGross(income);
  if (!Number.isFinite(gross)) {
    throw new Error('Could not compute annual income from the numbers you entered.');
  }

  const userAge =
    calculateAgeFromDateOfBirth(personal.dateOfBirth) ?? DEFAULT_PROFILE_INPUTS.userAge;

  const profile: ProfileInputs = {
    ...DEFAULT_PROFILE_INPUTS,
    dateOfBirth: personal.dateOfBirth,
    userAge: clampAge(userAge),
    filingStatus: personal.filingStatus,
    stateOfResidence: personal.stateOfResidence,
    annualIncome: gross,
    onboardingCompleted: true,
    incomeEntryMode: income.mode,
    baseAnnualSalary: income.mode === 'salary' ? income.baseAnnualSalary : null,
    hourlyWage: income.mode === 'hourly' ? income.hourlyWage : null,
    averageWeeklyHours: income.mode === 'hourly' ? income.averageWeeklyHours : null,
    annualBonus: income.annualBonus,
    annualCommission: income.annualCommission,
  };

  await saveProfile(userId, profile);

  const age = calculateAgeFromDateOfBirth(personal.dateOfBirth);
  if (age != null) {
    const supabase = getSupabase();
    const { data: retirementRow } = await supabase
      .from('retirement_plans')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (retirementRow) {
      const merged = { ...retirementRowToInputs(retirementRow), currentAge: age };
      await saveRetirementPlan(userId, merged);
    }
  }
}
