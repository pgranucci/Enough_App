/** Cap progress at 100% of target — overfunding must not inflate the Enough Score. */
export function goalCompletion(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min(currentAmount / targetAmount, 1);
}

/**
 * Retirement measures readiness (projected portfolio vs. dynamic need), not arbitrary targets.
 */
export function retirementGoalCompletion(
  estimatedPortfolio: number,
  estimatedNeed: number,
  readinessProgress?: number
): number {
  if (readinessProgress != null) {
    return Math.min(Math.max(readinessProgress, 0), 1);
  }
  if (estimatedNeed <= 0) return 1;
  return Math.min(estimatedPortfolio / estimatedNeed, 1);
}
