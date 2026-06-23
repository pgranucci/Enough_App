import { calculateAgeFromDateOfBirth } from '@/utils/profile-tax';
import { normalizeFiniteNumber } from '@/utils/numbers';

/** Mask user typing into MM/DD/YYYY (digits only, max 8). */
export function formatDobMmDdYyyy(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Parse MM/DD/YYYY → YYYY-MM-DD for storage / age helpers; null if invalid. */
export function parseDobMmDdYyyyToIso(display: string): string | null {
  const trimmed = display.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;

  const mm = normalizeFiniteNumber(m[1], Number.NaN);
  const dd = normalizeFiniteNumber(m[2], Number.NaN);
  const yyyy = normalizeFiniteNumber(m[3], Number.NaN);

  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  if (calculateAgeFromDateOfBirth(iso) == null) return null;

  return iso;
}
