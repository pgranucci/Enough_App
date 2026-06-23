import type { EnoughScoreResult } from '@/src/core/enough-score/compute-enough-score';
import type { ExcessBucketLine } from '@/utils/bucket-excess';
import { formatCurrency } from '@/utils/format';

export type EnoughScoreGoalProgressRow = {
  id: string;
  name: string;
  accent: string;
  completion: number;
  subtitle: string;
  percentLabel: string;
  amountPrefix?: string;
  amountPrimary: string;
  amountSecondary?: string;
};

function completionForLine(id: string, result: EnoughScoreResult): number {
  if (id === 'emergency') return result.emergencyCompletion;
  if (id === 'slush') return result.slushCompletion;
  if (id === 'retirement') return result.retirementCompletion;
  return result.customGoalBreakdown.find((goal) => goal.id === id)?.completion ?? 0;
}

function subtitleForLine(line: ExcessBucketLine): string {
  if (line.id === 'retirement') {
    return `Current balance ${formatCurrency(line.current)}`;
  }

  const detail = `${formatCurrency(line.current)} of ${formatCurrency(line.target)}`;
  return line.groupLabel ? `${detail} · ${line.groupLabel}` : detail;
}

/** Same goal ordering as Freedom → My Excess → All buckets. */
export function buildEnoughScoreGoalProgressRows(
  lines: ExcessBucketLine[],
  result: EnoughScoreResult
): EnoughScoreGoalProgressRow[] {
  return lines.map((line) => {
    const completion = completionForLine(line.id, result);
    const isRetirement = line.id === 'retirement';
    return {
      id: line.id,
      name: line.name,
      accent: line.accent,
      completion,
      subtitle: subtitleForLine(line),
      percentLabel: `${Math.round(completion * 100)}%`,
      amountPrefix: isRetirement ? 'Current balance ' : undefined,
      amountPrimary: formatCurrency(line.current),
      amountSecondary: isRetirement ? undefined : ` of ${formatCurrency(line.target)}`,
    };
  });
}
