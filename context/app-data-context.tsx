import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { BucketEntry, BucketItem } from '@/constants/buckets';
import {
  bucketWithoutAssignedAccounts,
  getCoreBucketEntries,
  getDefaultCoreBucketTarget,
  isRemovableBucket,
} from '@/constants/buckets';
import type { ExpenseInputs, ProfileInputs } from '@/constants/profile';
import { DEFAULT_PROFILE_INPUTS, getHouseholdAnnualIncome } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import { useSupabaseAuth } from '@/context/supabase-auth-context';
import { isSupabaseConfigured } from '@/lib/env';
import {
  deleteCustomBucket,
  ensureUserRows,
  fetchUserData,
  saveCustomBucket,
  saveExcessPreference,
  saveProfile,
  saveRetirementPlan,
  UserDataLoadError,
  type UserDataLoadErrorKind,
} from '@/lib/supabase/user-data';
import {
  buildDefaultExcessIncluded,
  calculateExcessSummary,
  flattenBucketsForExcess,
} from '@/utils/bucket-excess';
import { dedupeBucketAssignedAccountIds } from '@/src/core/buckets/account-assignment';
import { applyAssignedAccountsToBucket } from '@/src/core/buckets/assigned-accounts';
import {
  computeEnoughScoreFromBuckets,
  type EnoughScoreResult,
} from '@/src/core/enough-score/compute-enough-score';
import {
  computeBucketSummaries,
  computeNextPriority,
} from '@/utils/progress-score';
import { resolvePartialExpenseBucketTargets } from '@/src/core/buckets/expense-targets';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { retirementInputsWithProfileAges } from '@/utils/profile-age';
import { retirementInputsForBucket } from '@/utils/retirement-bucket-sync';

type AppDataContextValue = {
  loading: boolean;
  synced: boolean;
  loadError: AppDataLoadError | null;
  saveStatus: AppDataSaveStatus;
  retryFailedSave: () => Promise<void>;
  profile: ProfileInputs;
  updateProfile: (patch: Partial<ProfileInputs>) => void;
  saveOnboardingCompletion: (
    nextProfile: ProfileInputs,
    nextRetirement: RetirementInputs
  ) => Promise<void>;
  /** Merge into `profile.expenses` using latest state (safe for rapid slider updates). */
  patchExpenses: (patch: Partial<ExpenseInputs>) => void;
  retirement: RetirementInputs;
  updateRetirement: (patch: Partial<RetirementInputs>) => void;
  bucketEntries: BucketEntry[];
  customBuckets: BucketItem[];
  addCustomBucket: (bucket: BucketItem) => Promise<void>;
  updateCustomBucket: (bucket: BucketItem) => Promise<void>;
  removeCustomBucket: (bucketId: string) => Promise<void>;
  excessIncluded: Record<string, boolean>;
  setExcessIncluded: (id: string, included: boolean) => void;
  excessSummary: ReturnType<typeof calculateExcessSummary>;
  enoughScore: number;
  enoughScoreResult: EnoughScoreResult;
  bucketSummaries: ReturnType<typeof computeBucketSummaries>;
  nextPriority: ReturnType<typeof computeNextPriority>;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export type AppDataLoadError = {
  kind: UserDataLoadErrorKind;
  message: string;
};

export type AppDataSaveStatus =
  | { state: 'idle'; message: null }
  | { state: 'saving'; message: string }
  | { state: 'saved'; message: string }
  | { state: 'error'; message: string };

function normalizeLoadError(error: unknown): AppDataLoadError {
  if (error instanceof UserDataLoadError) {
    return { kind: error.kind, message: error.message };
  }

  if (error instanceof Error) {
    return { kind: 'database', message: error.message };
  }

  return { kind: 'database', message: 'Unable to load your profile data.' };
}

function saveErrorMessage(label: string, error: unknown) {
  const detail = error instanceof Error && error.message.trim() ? ` ${error.message}` : '';
  return `Couldn't save ${label}.${detail}`;
}

function useDebouncedSave<T>(
  saveFn: (value: T, generation: number) => Promise<void>,
  beginSave: (label: string) => number,
  label: string,
  delayMs = 600
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ value: T; generation: number } | null>(null);

  return useCallback(
    (value: T) => {
      const generation = beginSave(label);
      latest.current = { value, generation };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (latest.current != null) {
          void saveFn(latest.current.value, latest.current.generation);
        }
      }, delayMs);
    },
    [saveFn, beginSave, label, delayMs]
  );
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, session, configured: authConfigured } = useSupabaseAuth();
  const userId = user?.id;

  const [loading, setLoading] = useState(authConfigured);
  const [synced, setSynced] = useState(false);
  const [loadError, setLoadError] = useState<AppDataLoadError | null>(null);
  const [saveStatus, setSaveStatus] = useState<AppDataSaveStatus>({
    state: 'idle',
    message: null,
  });
  const [profile, setProfile] = useState<ProfileInputs>(DEFAULT_PROFILE_INPUTS);
  const [retirement, setRetirement] = useState<RetirementInputs>(DEFAULT_RETIREMENT_INPUTS);
  const [coreBucketOverrides, setCoreBucketOverrides] = useState<Record<string, BucketItem>>({});
  const [customBuckets, setCustomBuckets] = useState<BucketItem[]>([]);
  const [excessIncluded, setExcessIncludedState] = useState<Record<string, boolean>>({});
  const saveGeneration = useRef(0);
  const activeSaveCount = useRef(0);
  const failedSaveRetry = useRef<(() => Promise<void>) | null>(null);
  const savedStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSavedStatusTimer = useCallback(() => {
    if (savedStatusTimer.current) {
      clearTimeout(savedStatusTimer.current);
      savedStatusTimer.current = null;
    }
  }, []);

  const beginSave = useCallback(
    (label: string) => {
      clearSavedStatusTimer();
      const generation = saveGeneration.current + 1;
      saveGeneration.current = generation;
      failedSaveRetry.current = null;
      setSaveStatus({ state: 'saving', message: `Saving ${label}...` });
      return generation;
    },
    [clearSavedStatusTimer]
  );

  const finishSave = useCallback(
    (generation: number) => {
      if (generation !== saveGeneration.current || activeSaveCount.current > 0) return;
      setSaveStatus({ state: 'saved', message: 'All changes saved.' });
      clearSavedStatusTimer();
      savedStatusTimer.current = setTimeout(() => {
        if (generation === saveGeneration.current) {
          setSaveStatus({ state: 'idle', message: null });
        }
      }, 2500);
    },
    [clearSavedStatusTimer]
  );

  const trackSave = useCallback(
    async (
      label: string,
      operation: () => Promise<void>,
      options?: { generation?: number; retry?: () => Promise<void>; rethrow?: boolean }
    ) => {
      const generation = options?.generation ?? beginSave(label);
      activeSaveCount.current += 1;
      try {
        await operation();
        activeSaveCount.current = Math.max(0, activeSaveCount.current - 1);
        finishSave(generation);
      } catch (error) {
        activeSaveCount.current = Math.max(0, activeSaveCount.current - 1);
        if (generation === saveGeneration.current) {
          failedSaveRetry.current = options?.retry ?? operation;
          clearSavedStatusTimer();
          setSaveStatus({ state: 'error', message: saveErrorMessage(label, error) });
        }
        if (options?.rethrow) {
          throw error;
        }
      }
    },
    [beginSave, clearSavedStatusTimer, finishSave]
  );

  const retryFailedSave = useCallback(async () => {
    const retry = failedSaveRetry.current;
    if (!retry) return;
    const generation = beginSave('changes');
    await trackSave('changes', retry, { generation, retry });
  }, [beginSave, trackSave]);

  const loadFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setSynced(false);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      let data;
      try {
        data = await fetchUserData(userId);
      } catch (error) {
        if (!(error instanceof UserDataLoadError) || error.kind !== 'profile-not-found') {
          throw error;
        }
        await ensureUserRows(userId);
        data = await fetchUserData(userId);
      }
      setProfile(data.profile);
      setRetirement(
        applyIncomeReplacementToRetirement(
          data.retirement,
          getHouseholdAnnualIncome(data.profile)
        )
      );
      setCoreBucketOverrides(data.coreBucketOverrides);
      setCustomBuckets(data.customBuckets);
      setExcessIncludedState(data.excessIncluded);
      setSynced(true);
      setLoadError(null);
    } catch (e) {
      console.warn('Failed to load user data', e);
      setSynced(false);
      setLoadError(normalizeLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!authConfigured) {
      setLoading(false);
      setSynced(false);
      return;
    }

    if (!session) {
      setProfile(DEFAULT_PROFILE_INPUTS);
      setRetirement(DEFAULT_RETIREMENT_INPUTS);
      setCoreBucketOverrides({});
      setCustomBuckets([]);
      setExcessIncludedState({});
      setSynced(false);
      setLoadError(null);
      setSaveStatus({ state: 'idle', message: null });
      setLoading(false);
      return;
    }

    void loadFromSupabase();
  }, [authConfigured, session, loadFromSupabase]);

  const debouncedSaveProfile = useDebouncedSave(
    useCallback(
      async (value: ProfileInputs, generation: number) => {
        if (!userId) return;
        await trackSave('profile', () => saveProfile(userId, value), {
          generation,
          retry: () => saveProfile(userId, value),
        });
      },
      [trackSave, userId]
    ),
    beginSave,
    'profile'
  );

  const debouncedSaveRetirement = useDebouncedSave(
    useCallback(
      async (value: RetirementInputs, generation: number) => {
        if (!userId) return;
        await trackSave('retirement plan', () => saveRetirementPlan(userId, value), {
          generation,
          retry: () => saveRetirementPlan(userId, value),
        });
      },
      [trackSave, userId]
    ),
    beginSave,
    'retirement plan'
  );

  const updateProfile = useCallback(
    (patch: Partial<ProfileInputs>) => {
      setProfile((current) => {
        const next = { ...current, ...patch };
        if (userId) debouncedSaveProfile(next);
        return next;
      });
    },
    [userId, debouncedSaveProfile]
  );

  const patchExpenses = useCallback(
    (patch: Partial<ExpenseInputs>) => {
      setProfile((current) => {
        const expenses = { ...current.expenses, ...patch };
        if (patch.bucketAssignedAccountIds) {
          expenses.bucketAssignedAccountIds = dedupeBucketAssignedAccountIds(
            patch.bucketAssignedAccountIds
          );
        }
        const next: ProfileInputs = {
          ...current,
          expenses,
        };
        if (userId) debouncedSaveProfile(next);
        return next;
      });
    },
    [userId, debouncedSaveProfile]
  );

  const updateRetirement = useCallback(
    (patch: Partial<RetirementInputs>) => {
      setRetirement((current) => {
        const next = { ...current, ...patch };
        if (userId) debouncedSaveRetirement(next);
        return next;
      });
    },
    [userId, debouncedSaveRetirement]
  );

  const saveOnboardingCompletion = useCallback(
    async (nextProfile: ProfileInputs, nextRetirement: RetirementInputs) => {
      if (userId) {
        await trackSave(
          'onboarding',
          async () => {
            await saveRetirementPlan(userId, nextRetirement);
            await saveProfile(userId, nextProfile);
          },
          {
            retry: async () => {
              await saveRetirementPlan(userId, nextRetirement);
              await saveProfile(userId, nextProfile);
            },
            rethrow: true,
          }
        );
      }

      setRetirement(nextRetirement);
      setProfile(nextProfile);
    },
    [trackSave, userId]
  );

  const emergencyAnchorTarget = useMemo(
    () =>
      coreBucketOverrides.emergency?.target ?? getDefaultCoreBucketTarget('emergency'),
    [coreBucketOverrides.emergency?.target]
  );

  const slushAnchorTarget = useMemo(
    () => coreBucketOverrides.slush?.target ?? getDefaultCoreBucketTarget('slush'),
    [coreBucketOverrides.slush?.target]
  );

  const expenseTargets = useMemo(
    () =>
      resolvePartialExpenseBucketTargets(
        profile.expenses,
        emergencyAnchorTarget,
        slushAnchorTarget
      ),
    [profile.expenses, emergencyAnchorTarget, slushAnchorTarget]
  );

  const householdGross = useMemo(() => getHouseholdAnnualIncome(profile), [profile]);

  const retirementForBuckets = useMemo(() => {
    const withIncome = applyIncomeReplacementToRetirement(retirement, householdGross);
    const withAges = retirementInputsWithProfileAges(withIncome, profile);
    return retirementInputsForBucket(
      withAges,
      profile,
      householdGross,
      profile.expenses.bucketAssignedAccountIds?.retirement
    );
  }, [retirement, householdGross, profile]);

  const bucketEntries = useMemo(
    () => {
      const assignedMap = profile.expenses.bucketAssignedAccountIds ?? {};
      const allAccounts = retirement.accounts;

      const baseEntries = [
        ...getCoreBucketEntries(
          retirementForBuckets,
          coreBucketOverrides,
          expenseTargets,
          profile
        ),
        ...customBuckets,
      ];

      return baseEntries.map((entry) => {
        if ('children' in entry) return entry;
        const accountIds = assignedMap[entry.id];
        if (!Array.isArray(accountIds) || accountIds.length === 0) {
          return bucketWithoutAssignedAccounts(entry);
        }
        if (entry.id === 'retirement') return entry;
        const selectedIds = new Set(accountIds);
        const selectedAccounts = allAccounts.filter((account) => selectedIds.has(account.id));
        if (selectedAccounts.length === 0) return bucketWithoutAssignedAccounts(entry);
        return applyAssignedAccountsToBucket(entry, selectedAccounts, retirementForBuckets, profile);
      });
    },
    [retirementForBuckets, retirement.accounts, coreBucketOverrides, customBuckets, expenseTargets, profile]
  );

  const excessLines = useMemo(() => flattenBucketsForExcess(bucketEntries), [bucketEntries]);

  const excessIncludedMerged = useMemo(
    () => buildDefaultExcessIncluded(excessLines, excessIncluded),
    [excessLines, excessIncluded]
  );

  const excessSummary = useMemo(
    () => calculateExcessSummary(excessLines, excessIncludedMerged),
    [excessLines, excessIncludedMerged]
  );

  const enoughScoreResult = useMemo(
    () => computeEnoughScoreFromBuckets(bucketEntries),
    [bucketEntries]
  );
  const enoughScore = enoughScoreResult.enoughScore;
  const bucketSummaries = useMemo(() => computeBucketSummaries(bucketEntries), [bucketEntries]);
  const nextPriority = useMemo(() => computeNextPriority(bucketEntries), [bucketEntries]);

  const setExcessIncluded = useCallback(
    (id: string, included: boolean) => {
      setExcessIncludedState((current) => ({ ...current, [id]: included }));
      if (userId) {
        void trackSave('excess preference', () => saveExcessPreference(userId, id, included), {
          retry: () => saveExcessPreference(userId, id, included),
        });
      }
    },
    [trackSave, userId]
  );

  const addCustomBucket = useCallback(
    async (bucket: BucketItem) => {
      let sortOrder = customBuckets.length;
      setCustomBuckets((current) => {
        const next = [...current, bucket];
        sortOrder = next.length - 1;
        return next;
      });
      setExcessIncludedState((current) => ({ ...current, [bucket.id]: true }));
      if (userId) {
        await trackSave(
          'custom bucket',
          async () => {
            await saveCustomBucket(userId, bucket, sortOrder);
            await saveExcessPreference(userId, bucket.id, true);
          },
          {
            retry: async () => {
              await saveCustomBucket(userId, bucket, sortOrder);
              await saveExcessPreference(userId, bucket.id, true);
            },
          }
        );
      }
    },
    [customBuckets.length, trackSave, userId]
  );

  const updateCustomBucket = useCallback(
    async (bucket: BucketItem) => {
      let sortOrder: number | null = null;
      setCustomBuckets((current) => {
        const index = current.findIndex((item) => item.id === bucket.id);
        if (index < 0) return current;
        sortOrder = index;
        const next = [...current];
        next[index] = bucket;
        return next;
      });
      if (userId && sortOrder != null) {
        const resolvedSortOrder = sortOrder;
        await trackSave('custom bucket', () => saveCustomBucket(userId, bucket, resolvedSortOrder), {
          retry: () => saveCustomBucket(userId, bucket, resolvedSortOrder),
        });
      }
    },
    [trackSave, userId]
  );

  const removeCustomBucket = useCallback(
    async (bucketId: string) => {
      if (!isRemovableBucket(bucketId)) return;

      setCustomBuckets((current) => current.filter((bucket) => bucket.id !== bucketId));
      setExcessIncludedState((current) => {
        const next = { ...current };
        delete next[bucketId];
        return next;
      });
      setProfile((current) => {
        const assigned = current.expenses.bucketAssignedAccountIds ?? {};
        if (!(bucketId in assigned)) return current;
        const { [bucketId]: _removed, ...restAssigned } = assigned;
        const next: ProfileInputs = {
          ...current,
          expenses: {
            ...current.expenses,
            bucketAssignedAccountIds: restAssigned,
          },
        };
        if (userId) debouncedSaveProfile(next);
        return next;
      });

      if (userId) {
        await trackSave('custom bucket', () => deleteCustomBucket(userId, bucketId), {
          retry: () => deleteCustomBucket(userId, bucketId),
        });
      }
    },
    [userId, debouncedSaveProfile, trackSave]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      synced,
      loadError,
      saveStatus,
      retryFailedSave,
      profile,
      updateProfile,
      saveOnboardingCompletion,
      patchExpenses,
      retirement,
      updateRetirement,
      bucketEntries,
      customBuckets,
      addCustomBucket,
      updateCustomBucket,
      removeCustomBucket,
      excessIncluded: excessIncludedMerged,
      setExcessIncluded,
      excessSummary,
      enoughScore,
      enoughScoreResult,
      bucketSummaries,
      nextPriority,
      refresh: loadFromSupabase,
    }),
    [
      loading,
      synced,
      loadError,
      saveStatus,
      retryFailedSave,
      profile,
      updateProfile,
      saveOnboardingCompletion,
      patchExpenses,
      retirement,
      updateRetirement,
      bucketEntries,
      customBuckets,
      addCustomBucket,
      updateCustomBucket,
      removeCustomBucket,
      excessIncludedMerged,
      setExcessIncluded,
      excessSummary,
      enoughScore,
      enoughScoreResult,
      bucketSummaries,
      nextPriority,
      loadFromSupabase,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}

/** @deprecated Use useAppData */
export const useCustomBuckets = useAppData;
