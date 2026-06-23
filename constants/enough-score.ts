export const PROGRESS_RING_COMPLETE = '#16A34A';
export const PROGRESS_RING_INCOMPLETE = '#FFFFFF';

/** Ring stroke at/above goal (progress ≥ 1) is green; otherwise white. */
export function circularProgressRingStrokeColor(progress: number): string {
  return progress >= 1 ? PROGRESS_RING_COMPLETE : PROGRESS_RING_INCOMPLETE;
}
