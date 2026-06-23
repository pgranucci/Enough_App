import type { BucketEntry, BucketItem } from '@/constants/buckets';
import { isBucketGroup } from '@/constants/buckets';
import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';

export type ProgressSummary = {
  id: string;
  name: string;
  current: number;
  target: number;
  accent: string;
};

export type NextPriority = {
  bucket: string;
  message: string;
};

function leafSummaries(entries: BucketEntry[]): ProgressSummary[] {
  const summaries: ProgressSummary[] = [];

  for (const entry of entries) {
    if (isBucketGroup(entry)) {
      for (const child of entry.children) {
        summaries.push({
          id: child.id,
          name: child.name,
          current: child.current,
          target: child.target,
          accent: child.accent,
        });
      }
    } else {
      const readiness =
        entry.id === 'retirement' && entry.readinessProgress != null
          ? entry.readinessProgress
          : null;
      summaries.push({
        id: entry.id,
        name: entry.name,
        current:
          readiness != null && entry.target > 0 ? readiness * entry.target : entry.current,
        target: entry.target,
        accent: entry.accent,
      });
    }
  }

  return summaries;
}

/** @deprecated Use {@link computeEnoughScoreFromBuckets} for the weighted breakdown. */
export function computeEnoughScore(entries: BucketEntry[]): number {
  return computeEnoughScoreFromBuckets(entries).enoughScore;
}

export function computeBucketSummaries(entries: BucketEntry[]): ProgressSummary[] {
  return leafSummaries(entries).filter((s) =>
    ['emergency', 'slush', 'retirement'].includes(s.id)
  );
}

export function computeNextPriority(entries: BucketEntry[]): NextPriority {
  const summaries = leafSummaries(entries);
  const incomplete = summaries
    .map((bucket) => ({
      ...bucket,
      progress: bucket.target > 0 ? bucket.current / bucket.target : 0,
    }))
    .filter((bucket) => bucket.progress < 1)
    .sort((a, b) => a.progress - b.progress);

  const weakest = incomplete[0];
  if (!weakest) {
    return {
      bucket: 'All buckets',
      message: 'You are at or above target on every bucket. Consider raising targets or redirecting excess.',
    };
  }

  const gap = Math.max(0, weakest.target - weakest.current);
  return {
    bucket: weakest.name,
    message: `Add ${formatGap(gap)} to strengthen ${weakest.name} — your lowest-progress bucket right now.`,
  };
}

function formatGap(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function flattenBucketItems(entries: BucketEntry[]): BucketItem[] {
  const items: BucketItem[] = [];
  for (const entry of entries) {
    if (isBucketGroup(entry)) {
      items.push(...entry.children);
    } else {
      items.push(entry);
    }
  }
  return items;
}
