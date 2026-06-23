import { toYearMonthKey } from '@/src/core/shared/dates';
import { normalizeFiniteNumber } from '@/utils/numbers';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Whole-dollar currency field: strips non-digits, shows $ and grouping (e.g. $85,000). */
export function formatUsdWholeInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  const n = normalizeFiniteNumber(digits, Number.NaN);
  if (!Number.isFinite(n)) return '';
  return `$${n.toLocaleString('en-US')}`;
}

/** Whole-number field with grouping only (e.g. 85,000) — use with a separate $ affix. */
export function formatWholeNumberDisplay(
  value: number,
  options?: { allowZero?: boolean }
): string {
  if (!Number.isFinite(value) || value < 0) return '';
  if (value === 0) return options?.allowZero ? '0' : '';
  return Math.round(value).toLocaleString('en-US');
}

export function formatWholeNumberInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  return normalizeFiniteNumber(digits, 0).toLocaleString('en-US');
}

/** Inverse of {@link formatUsdWholeInput} for math / API payloads. */
export function parseUsdWholeToNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  return normalizeFiniteNumber(digits, 0);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Month + year only, e.g. "May 2026" (no day). */
export function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Estimated completion for bucket cards; unreachable goals show "-". */
export function formatEstimatedCompletionDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return formatMonthYear(iso);
}

/** Months between two YYYY-MM completion dates; positive means the after date is sooner. */
export function monthsBetweenCompletionDates(
  beforeIso: string | null | undefined,
  afterIso: string | null | undefined
): number | null {
  const beforeKey = toYearMonthKey(beforeIso ?? '');
  const afterKey = toYearMonthKey(afterIso ?? '');
  if (beforeKey == null || afterKey == null) return null;

  const beforeYear = Math.floor(beforeKey / 100);
  const beforeMonth = beforeKey % 100;
  const afterYear = Math.floor(afterKey / 100);
  const afterMonth = afterKey % 100;

  return (beforeYear - afterYear) * 12 + (beforeMonth - afterMonth);
}

/** e.g. "Goal Reached 8 Years Earlier" when completion moves sooner. */
export function formatGoalAcceleration(
  beforeIso: string | null | undefined,
  afterIso: string | null | undefined
): string | null {
  const months = monthsBetweenCompletionDates(beforeIso, afterIso);
  if (months == null || months <= 0) return null;

  if (months >= 12) {
    const years = Math.round(months / 12);
    return `Goal Reached ${years} ${years === 1 ? 'Year' : 'Years'} Earlier`;
  }

  return `Goal Reached ${months} ${months === 1 ? 'Month' : 'Months'} Earlier`;
}

/** Human-readable time until a savings goal, e.g. "8 years away" or "6 months away". */
export function formatGoalHorizon(years: number | undefined | null) {
  if (years == null || years <= 0) return '-';
  const months = Math.round(years * 12);
  if (months < 12) {
    return months === 1 ? '1 month away' : `${months} months away`;
  }
  const roundedYears = Math.round(years * 10) / 10;
  return roundedYears === 1 ? '1 year away' : `${roundedYears} years away`;
}

/** Goal target month stored as YYYY-MM-01, e.g. "May 2030". */
export function formatGoalTargetDate(iso: string | undefined | null) {
  if (!iso?.trim()) return '-';
  return formatMonthYear(iso);
}

/** Prefer a stored target month; fall back to years-until for older buckets. */
export function formatGoalTimeline(
  goalTargetMonth: string | undefined | null,
  goalHorizonYears: number | undefined | null
) {
  if (goalTargetMonth?.trim()) return formatGoalTargetDate(goalTargetMonth);
  return formatGoalHorizon(goalHorizonYears);
}

export function formatPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export function formatRate(value: number) {
  return `${value}%`;
}

/** Strip invalid characters; allow a single decimal point while typing. */
export function sanitizePercentInputText(text: string): string {
  let cleaned = text.replace(/[^0-9.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex >= 0) {
    cleaned =
      cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '');
  }
  return cleaned;
}

export function formatPercentValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

export function parsePercentInput(text: string): number {
  const cleaned = sanitizePercentInputText(text);
  if (!cleaned || cleaned === '.') return 0;
  const n = normalizeFiniteNumber(cleaned, 0);
  return Math.min(100, Math.max(0, n));
}
