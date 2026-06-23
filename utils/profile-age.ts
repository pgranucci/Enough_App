import type { ProfileInputs } from '@/constants/profile';
import type { RetirementInputs } from '@/constants/retirement';
import { normalizeFiniteNumber } from '@/utils/numbers';

export function clampAge(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(120, Math.max(0, Math.round(value)));
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD into a local calendar date (no UTC shift). */
export function parseIsoDateOfBirth(dateOfBirth: string): Date | null {
  const match = ISO_DATE.exec(dateOfBirth.trim());
  if (!match) return null;

  const year = normalizeFiniteNumber(match[1], Number.NaN);
  const month = normalizeFiniteNumber(match[2], Number.NaN) - 1;
  const day = normalizeFiniteNumber(match[3], Number.NaN);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function isValidDateOfBirth(dateOfBirth: string): boolean {
  return parseIsoDateOfBirth(dateOfBirth) != null;
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string, asOf: Date = new Date()): number | null {
  const birthDate = parseIsoDateOfBirth(dateOfBirth);
  if (!birthDate) return null;

  let age = asOf.getFullYear() - birthDate.getFullYear();
  const monthDiff = asOf.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  if (age < 0 || age > 120) return null;
  return age;
}

/** Store as YYYY-MM-DD. */
export function normalizeDateOfBirth(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (ISO_DATE.test(trimmed)) {
    return isValidDateOfBirth(trimmed) ? trimmed : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 8) {
    const month = normalizeFiniteNumber(digits.slice(0, 2), Number.NaN);
    const day = normalizeFiniteNumber(digits.slice(2, 4), Number.NaN);
    const year = normalizeFiniteNumber(digits.slice(4, 8), Number.NaN);
    const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return isValidDateOfBirth(iso) ? iso : null;
  }

  return null;
}

/** MM/DD/YYYY for display; passthrough while typing partial input. */
export function formatDateOfBirthDisplay(stored: string): string {
  const iso = normalizeDateOfBirth(stored);
  if (!iso) {
    const digits = stored.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  const [, y, m, d] = iso.match(ISO_DATE) ?? [];
  return `${m}/${d}/${y}`;
}

export function parseDateOfBirthInput(display: string): string | null {
  return normalizeDateOfBirth(display);
}

/** Approximate ISO date of birth from age (mid-year) for legacy rows only. */
export function dateOfBirthFromAge(age: number, asOf: Date = new Date()): string {
  const year = asOf.getFullYear() - clampAge(age);
  return `${year}-06-15`;
}

export function parseAgeInput(text: string): number {
  return clampAge(normalizeFiniteNumber(text.replace(/[^0-9]/g, ''), 0));
}

export function ageFromProfileDateOfBirth(profile: Pick<ProfileInputs, 'dateOfBirth'>): number | null {
  return calculateAgeFromDateOfBirth(profile.dateOfBirth);
}

export function ageFromPartnerDateOfBirth(
  profile: Pick<ProfileInputs, 'partnerDateOfBirth' | 'partnerAge'>
): number | null {
  const fromDob = calculateAgeFromDateOfBirth(profile.partnerDateOfBirth);
  if (fromDob != null) return fromDob;
  if (profile.partnerAge > 0) return clampAge(profile.partnerAge);
  return null;
}

/**
 * Whole months from today until the date the person reaches retirementAge
 * (same calendar month/day as date of birth).
 */
export function monthsUntilRetirementAge(
  dateOfBirth: string,
  retirementAge: number,
  asOf: Date = new Date()
): number {
  const birthDate = parseIsoDateOfBirth(dateOfBirth);
  if (!birthDate || retirementAge < 0) return 0;

  const retirementDate = new Date(
    birthDate.getFullYear() + retirementAge,
    birthDate.getMonth(),
    birthDate.getDate()
  );

  let months =
    (retirementDate.getFullYear() - asOf.getFullYear()) * 12 +
    (retirementDate.getMonth() - asOf.getMonth());

  if (asOf.getDate() > retirementDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function yearsUntilRetirementAge(
  dateOfBirth: string,
  retirementAge: number,
  asOf: Date = new Date()
): number {
  return monthsUntilRetirementAge(dateOfBirth, retirementAge, asOf) / 12;
}

/** Keep retirement plan current age aligned with profile date of birth. */
export function retirementInputsWithProfileAges(
  retirement: RetirementInputs,
  profile: ProfileInputs
): RetirementInputs {
  const currentAge = ageFromProfileDateOfBirth(profile);
  return {
    ...retirement,
    currentAge: currentAge ?? retirement.currentAge,
  };
}

export function profileWithDerivedAges(
  profile: ProfileInputs
): ProfileInputs {
  const userAge = ageFromProfileDateOfBirth(profile) ?? profile.userAge;
  const partnerAge =
    profile.planningMode === 'partner'
      ? ageFromPartnerDateOfBirth(profile) ?? profile.partnerAge
      : 0;

  return { ...profile, userAge: clampAge(userAge), partnerAge: clampAge(partnerAge) };
}
