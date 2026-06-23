export type BucketAssignedAccountIds = Record<string, string[]>;

/** Bucket that currently owns an account assignment, if any. */
export function findBucketForAssignedAccount(
  accountId: string,
  assignedMap: BucketAssignedAccountIds,
  excludeBucketId?: string
): string | null {
  for (const [bucketId, ids] of Object.entries(assignedMap)) {
    if (excludeBucketId && bucketId === excludeBucketId) continue;
    if (ids.includes(accountId)) return bucketId;
  }
  return null;
}

export function isAccountAvailableForBucket(
  accountId: string,
  bucketId: string,
  assignedMap: BucketAssignedAccountIds
): boolean {
  const owner = findBucketForAssignedAccount(accountId, assignedMap, bucketId);
  return owner == null;
}

export function unassignAccountFromBucket(
  accountId: string,
  bucketId: string,
  assignedMap: BucketAssignedAccountIds
): BucketAssignedAccountIds {
  const current = assignedMap[bucketId] ?? [];
  const nextIds = current.filter((id) => id !== accountId);
  const next = { ...assignedMap };
  if (nextIds.length === 0) {
    delete next[bucketId];
  } else {
    next[bucketId] = nextIds;
  }
  return next;
}

export function assignAccountToBucket(
  accountId: string,
  bucketId: string,
  assignedMap: BucketAssignedAccountIds
): { ok: true; next: BucketAssignedAccountIds } | { ok: false; ownerBucketId: string } {
  const owner = findBucketForAssignedAccount(accountId, assignedMap, bucketId);
  if (owner != null) {
    return { ok: false, ownerBucketId: owner };
  }

  const current = assignedMap[bucketId] ?? [];
  if (current.includes(accountId)) {
    return { ok: true, next: assignedMap };
  }

  return {
    ok: true,
    next: {
      ...assignedMap,
      [bucketId]: [...current, accountId],
    },
  };
}

export function toggleBucketAccountAssignment(
  accountId: string,
  bucketId: string,
  assignedMap: BucketAssignedAccountIds
): { ok: true; next: BucketAssignedAccountIds } | { ok: false; ownerBucketId: string } {
  const current = assignedMap[bucketId] ?? [];
  if (current.includes(accountId)) {
    return { ok: true, next: unassignAccountFromBucket(accountId, bucketId, assignedMap) };
  }
  return assignAccountToBucket(accountId, bucketId, assignedMap);
}

/** Keep the first bucket per account — repairs legacy duplicate assignments. */
export function dedupeBucketAssignedAccountIds(
  assignedMap: BucketAssignedAccountIds
): BucketAssignedAccountIds {
  const seen = new Set<string>();
  const next: BucketAssignedAccountIds = {};

  for (const [bucketId, ids] of Object.entries(assignedMap)) {
    const kept: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      kept.push(id);
    }
    if (kept.length > 0) next[bucketId] = kept;
  }

  return next;
}
