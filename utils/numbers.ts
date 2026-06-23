export function parseNumber(value: string, fallback = 0) {
  return normalizeFiniteNumber(value.replace(/,/g, ''), fallback);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeFiniteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeNonNegativeFiniteNumber(value: unknown, fallback = 0) {
  return Math.max(0, normalizeFiniteNumber(value, fallback));
}

export function normalizeNullableFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = normalizeFiniteNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeNullableNonNegativeFiniteNumber(value: unknown): number | null {
  const parsed = normalizeNullableFiniteNumber(value);
  return parsed == null ? null : Math.max(0, parsed);
}
