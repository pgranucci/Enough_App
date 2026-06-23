import { normalizeFiniteNumber } from '@/utils/numbers';

export function toYearMonthKey(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(trimmed);
  if (iso) {
    const year = normalizeFiniteNumber(iso[1], Number.NaN);
    const month = normalizeFiniteNumber(iso[2], Number.NaN);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }
    return year * 100 + month;
  }

  const monthYear = /^(\d{2})\/(\d{4})$/.exec(trimmed);
  if (monthYear) {
    const month = normalizeFiniteNumber(monthYear[1], Number.NaN);
    const year = normalizeFiniteNumber(monthYear[2], Number.NaN);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }
    return year * 100 + month;
  }

  return null;
}

/** True through the payoff month; false once calendar month is after end month. */
export function isObligationActiveThroughMonth(
  maturityDate: string,
  now: Date = new Date()
): boolean {
  const endKey = toYearMonthKey(maturityDate);
  if (endKey == null) return true;

  const currentKey = now.getFullYear() * 100 + (now.getMonth() + 1);
  return currentKey <= endKey;
}

export function addMonthsToIso(months: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0] ?? '';
}
