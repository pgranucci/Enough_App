import { describe, expect, it } from 'vitest';

import { buildRetirementBucket } from '@/constants/buckets';
import { fixtureEmployer401kAccount, fixtureSoloTexasAccumulation } from '@/src/core/retirement/fixtures';
import { syncRetirementFromBucketAccounts } from '@/utils/retirement-bucket-sync';
import {
  retirementBucketReadinessMeetsTarget,
  retirementBucketReadinessPercent,
} from '@/utils/retirement-bucket-readiness';

describe('retirementBucketReadinessPercent', () => {
  it('matches the Buckets tab retirement ring percent', () => {
    const { retirement, profile } = fixtureSoloTexasAccumulation();
    const account = fixtureEmployer401kAccount();
    const synced = syncRetirementFromBucketAccounts([account], profile);
    const bucket = buildRetirementBucket(
      {
        ...retirement,
        ...synced,
        accounts: [account],
      },
      profile
    );

    expect(retirementBucketReadinessPercent(bucket)).toBe(
      Math.round(bucket.readinessProgress! * 100)
    );
    expect(retirementBucketReadinessMeetsTarget(bucket)).toBe(
      bucket.readinessProgress! >= 1
    );
  });
});
