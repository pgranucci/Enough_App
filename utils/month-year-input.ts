import { normalizeFiniteNumber } from '@/utils/numbers';

/** Mask typing into MM/YYYY (digits only, max 6). */
export function formatMonthYearInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Show stored ISO or partial value as MM/YYYY in inputs. */
export function formatMonthYearDisplay(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return '';

  const isoFull = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoFull) {
    return `${isoFull[2]}/${isoFull[1]}`;
  }

  const isoMonth = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (isoMonth) {
    return `${isoMonth[2]}/${isoMonth[1]}`;
  }

  if (/^\d{2}\/\d{4}$/.test(trimmed) || /^\d{1,2}\/?\d{0,4}$/.test(trimmed)) {
    return formatMonthYearInput(trimmed);
  }

  return trimmed;
}

/** Parse MM/YYYY → YYYY-MM-01 for storage; null if incomplete or invalid. */
export function parseMonthYearToIso(display: string): string | null {
  const trimmed = formatMonthYearDisplay(display.trim());
  const m = /^(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;

  const mm = normalizeFiniteNumber(m[1], Number.NaN);
  const yyyy = normalizeFiniteNumber(m[2], Number.NaN);

  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12) return null;

  return `${yyyy}-${String(mm).padStart(2, '0')}-01`;
}
