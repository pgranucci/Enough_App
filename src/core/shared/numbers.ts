export function finiteNonNeg(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
