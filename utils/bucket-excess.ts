import type { BucketEntry, BucketItem } from '@/constants/buckets';
import { isBucketGroup } from '@/constants/buckets';

/** Excess for one bucket: max(0, current − target). */
export function calculateBucketExcess(current: number, target: number) {
  return Math.max(current - target, 0);
}

export type ExcessBucketLine = {
  id: string;
  name: string;
  accent: string;
  current: number;
  target: number;
  excess: number;
  groupLabel?: string;
  sourceTemplateId?: string;
};

export type ExcessSummary = {
  totalExcess: number;
  lines: ExcessBucketLine[];
  includedLines: ExcessBucketLine[];
};

function lineFromBucket(bucket: BucketItem, groupLabel?: string): ExcessBucketLine {
  const current = bucket.current;
  const target = bucket.target;
  const excess = calculateBucketExcess(current, target);

  return {
    id: bucket.id,
    name: bucket.name,
    accent: bucket.accent,
    current,
    target,
    excess,
    groupLabel,
    sourceTemplateId: bucket.sourceTemplateId,
  };
}

export function flattenBucketsForExcess(entries: BucketEntry[]): ExcessBucketLine[] {
  const lines: ExcessBucketLine[] = [];

  for (const entry of entries) {
    if (!isBucketGroup(entry)) {
      lines.push(lineFromBucket(entry));
      continue;
    }

    for (const child of entry.children) {
      lines.push(lineFromBucket(child, entry.name));
    }
  }

  return lines;
}

export function calculateExcessSummary(
  lines: ExcessBucketLine[],
  includedIds: Record<string, boolean>
): ExcessSummary {
  const includedForTotal = lines.filter((line) => includedIds[line.id] !== false);
  const totalExcess = includedForTotal.reduce((sum, line) => sum + line.excess, 0);
  const includedLines = includedForTotal.filter((line) => line.excess > 0);

  return {
    totalExcess,
    lines,
    includedLines,
  };
}

export function buildDefaultExcessIncluded(lines: ExcessBucketLine[], existing: Record<string, boolean>) {
  return Object.fromEntries(
    lines.map((line) => [line.id, existing[line.id] ?? true])
  ) as Record<string, boolean>;
}
