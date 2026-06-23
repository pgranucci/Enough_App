import type { BucketItem } from '@/constants/buckets';

type RetirementBucketLike = Pick<BucketItem, 'id' | 'readinessProgress'> | null | undefined;

/** Same readiness % as the Retirement ring on the Buckets tab. */
export function retirementBucketReadinessPercent(bucket: RetirementBucketLike): number | undefined {
  if (bucket?.id !== 'retirement' || bucket.readinessProgress == null) return undefined;
  return Math.round(bucket.readinessProgress * 100);
}

export function retirementBucketReadinessMeetsTarget(bucket: RetirementBucketLike): boolean {
  return (bucket?.readinessProgress ?? 0) >= 1;
}
