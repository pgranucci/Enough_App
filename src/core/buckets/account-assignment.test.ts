import { describe, expect, it } from 'vitest';

import {
  dedupeBucketAssignedAccountIds,
  findBucketForAssignedAccount,
  isAccountAvailableForBucket,
  toggleBucketAccountAssignment,
} from '@/src/core/buckets/account-assignment';

describe('account-assignment', () => {
  const map = {
    retirement: ['brk-1'],
    slush: ['sav-1'],
    'house-goal': ['sav-2', 'brk-2'],
  };

  it('finds the bucket that owns an account', () => {
    expect(findBucketForAssignedAccount('brk-1', map)).toBe('retirement');
    expect(findBucketForAssignedAccount('sav-1', map)).toBe('slush');
    expect(findBucketForAssignedAccount('missing', map)).toBeNull();
  });

  it('can exclude the current bucket when checking availability', () => {
    expect(isAccountAvailableForBucket('brk-1', 'retirement', map)).toBe(true);
    expect(isAccountAvailableForBucket('brk-1', 'slush', map)).toBe(false);
  });

  it('blocks assigning an account that is already on another goal', () => {
    const result = toggleBucketAccountAssignment('brk-1', 'emergency', map);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.ownerBucketId).toBe('retirement');
    }
  });

  it('allows unassigning from the current bucket', () => {
    const result = toggleBucketAccountAssignment('sav-1', 'slush', map);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.slush).toBeUndefined();
      expect(result.next.retirement).toEqual(['brk-1']);
    }
  });

  it('allows assigning a free account to a bucket', () => {
    const result = toggleBucketAccountAssignment('sav-3', 'emergency', map);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.emergency).toEqual(['sav-3']);
    }
  });

  it('dedupes legacy duplicate assignments keeping the first bucket', () => {
    const duped = {
      retirement: ['brk-1'],
      slush: ['brk-1', 'sav-1'],
      emergency: ['sav-1'],
    };
    expect(dedupeBucketAssignedAccountIds(duped)).toEqual({
      retirement: ['brk-1'],
      slush: ['sav-1'],
    });
  });
});
