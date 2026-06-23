import type { USStateCode } from '@/constants/us-states';
import { dedupeBucketAssignedAccountIds } from '@/src/core/buckets/account-assignment';
import { normalizeFiniteNumber } from '@/utils/numbers';

export type IncomeEntryMode = 'salary' | 'hourly';

export type PlanningMode = 'solo' | 'partner';

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

/** Non-mortgage debt line (credit cards, auto loans, student loans, etc.). */
export type NonMortgageDebtLine = {
  id: string;
  /** Short label, e.g. "Car loan" */
  name: string;
  monthlyPayment: number;
  /** Payoff month as YYYY-MM-01 when complete, or partial MM/YYYY while editing */
  maturityDate: string;
};

export type HousingSituation = 'rent' | 'own';

export type MortgageInfo = {
  hasMortgage: boolean;
  /** When true, mortgage payment is treated as $0 for planning. */
  mortgagePaidOff: boolean;
  monthlyPayment: number;
  /** Payoff month as YYYY-MM-01 when complete, or partial MM/YYYY while editing */
  maturityDate: string;
};

export type ExpenseInputs = {
  housingSituation: HousingSituation;
  nonMortgageDebts: NonMortgageDebtLine[];
  mortgage: MortgageInfo;
  /** Monthly essentials excluding housing / mortgage (utilities, food, insurance, transport, etc.) */
  monthlyEssentialsExHousing: number;
  /** Rent, HOA, and other housing not covered by the mortgage payment field */
  monthlyHousingCost: number;
  /** Months of essential + housing + debt obligations to hold in emergency cash (1–24). */
  emergencyCoverageMonths: number;
  /** Months of total monthly spending to hold in the slush fund (1–24); see {@link computeMonthlyTotalExpenses}. */
  slushCoverageMonths: number;
  /** Monthly discretionary (travel, leisure, entertainment, etc.) */
  monthlyDiscretionary: number;
  /** Map of bucket id -> linked account ids used for current amount/contribution rollups. */
  bucketAssignedAccountIds: Record<string, string[]>;
};

export const DEFAULT_EXPENSE_INPUTS: ExpenseInputs = {
  housingSituation: 'rent',
  nonMortgageDebts: [],
  mortgage: { hasMortgage: false, mortgagePaidOff: false, monthlyPayment: 0, maturityDate: '' },
  monthlyEssentialsExHousing: 0,
  monthlyHousingCost: 0,
  emergencyCoverageMonths: 6,
  slushCoverageMonths: 3,
  monthlyDiscretionary: 0,
  bucketAssignedAccountIds: {},
};

function clampMoney(n: unknown): number {
  const x = normalizeFiniteNumber(n, 0);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

function clampCoverageMonths(n: unknown, fallback: number): number {
  const x = normalizeFiniteNumber(n, fallback);
  return Math.min(24, Math.max(1, Math.round(x)));
}

/** Normalize JSON from DB or legacy shapes into {@link ExpenseInputs}. */
export function normalizeExpenseInputs(raw: unknown): ExpenseInputs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EXPENSE_INPUTS, nonMortgageDebts: [] };
  }

  const o = raw as Record<string, unknown>;
  const debtsRaw = Array.isArray(o.nonMortgageDebts) ? o.nonMortgageDebts : [];
  const nonMortgageDebts: NonMortgageDebtLine[] = debtsRaw
    .map((row, i) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === 'string' ? r.id : `debt-${i}`,
        name: typeof r.name === 'string' ? r.name : '',
        monthlyPayment: clampMoney(r.monthlyPayment),
        maturityDate: typeof r.maturityDate === 'string' ? r.maturityDate : '',
      };
    })
    .filter((row): row is NonMortgageDebtLine => row != null);

  const mort =
    o.mortgage && typeof o.mortgage === 'object'
      ? (o.mortgage as Record<string, unknown>)
      : {};
  const mortgage: MortgageInfo = {
    hasMortgage: Boolean(mort.hasMortgage),
    mortgagePaidOff: Boolean(mort.mortgagePaidOff),
    monthlyPayment: clampMoney(mort.monthlyPayment),
    maturityDate: typeof mort.maturityDate === 'string' ? mort.maturityDate : '',
  };

  const housingSituation =
    o.housingSituation === 'own' || o.housingSituation === 'rent' ? o.housingSituation : 'rent';

  return {
    housingSituation,
    nonMortgageDebts,
    mortgage,
    monthlyEssentialsExHousing: clampMoney(o.monthlyEssentialsExHousing),
    monthlyHousingCost: clampMoney(o.monthlyHousingCost),
    emergencyCoverageMonths: clampCoverageMonths(o.emergencyCoverageMonths, 6),
    slushCoverageMonths: clampCoverageMonths(o.slushCoverageMonths, 3),
    monthlyDiscretionary: clampMoney(o.monthlyDiscretionary),
    bucketAssignedAccountIds: (() => {
      const mapped = o.bucketAssignedAccountIds;
      if (mapped && typeof mapped === 'object' && !Array.isArray(mapped)) {
        const rows = mapped as Record<string, unknown>;
        const normalized: Record<string, string[]> = {};
        for (const [bucketId, rawIds] of Object.entries(rows)) {
          if (!Array.isArray(rawIds)) continue;
          normalized[bucketId] = rawIds.filter((id): id is string => typeof id === 'string');
        }
        return dedupeBucketAssignedAccountIds(normalized);
      }
      // Backward compatibility with previous emergency-only storage.
      if (Array.isArray(o.emergencyAssignedAccountIds)) {
        return {
          emergency: o.emergencyAssignedAccountIds.filter(
            (id): id is string => typeof id === 'string'
          ),
        };
      }
      return {};
    })(),
  };
}

export type ProfileInputs = {
  userName: string;
  partnerName: string;
  dateOfBirth: string;
  userAge: number;
  filingStatus: FilingStatus;
  stateOfResidence: USStateCode;
  planningMode: PlanningMode;
  annualIncome: number;
  partnerAnnualIncome: number;
  partnerBaseAnnualSalary: number | null;
  partnerAnnualBonus: number;
  partnerAnnualCommission: number;
  partnerAge: number;
  partnerDateOfBirth: string;
  onboardingCompleted: boolean;
  incomeEntryMode: IncomeEntryMode | null;
  baseAnnualSalary: number | null;
  hourlyWage: number | null;
  averageWeeklyHours: number | null;
  annualBonus: number;
  annualCommission: number;
  expenses: ExpenseInputs;
};

export const DEFAULT_PROFILE_INPUTS: ProfileInputs = {
  userName: '',
  partnerName: '',
  dateOfBirth: '1990-06-15',
  userAge: 35,
  filingStatus: 'single',
  stateOfResidence: 'CA',
  planningMode: 'solo',
  annualIncome: 95000,
  partnerAnnualIncome: 0,
  partnerBaseAnnualSalary: null,
  partnerAnnualBonus: 0,
  partnerAnnualCommission: 0,
  partnerAge: 0,
  partnerDateOfBirth: '',
  onboardingCompleted: false,
  incomeEntryMode: null,
  baseAnnualSalary: null,
  hourlyWage: null,
  averageWeeklyHours: null,
  annualBonus: 0,
  annualCommission: 0,
  expenses: { ...DEFAULT_EXPENSE_INPUTS, nonMortgageDebts: [] },
};

export const FILING_STATUS_OPTIONS: { id: FilingStatus; label: string }[] = [
  { id: 'single', label: 'Single' },
  { id: 'married_joint', label: 'Married filing jointly' },
  { id: 'married_separate', label: 'Married filing separately' },
  { id: 'head_of_household', label: 'Head of household' },
];

export const PLANNING_MODE_OPTIONS: { id: PlanningMode; label: string }[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'partner', label: 'With a Partner' },
];

export const INCOME_ENTRY_MODE_OPTIONS: { id: IncomeEntryMode; label: string }[] = [
  { id: 'salary', label: 'Salaried' },
  { id: 'hourly', label: 'Hourly' },
];

/** Partner gross from salary + bonus + commission (falls back to stored total when unsplit). */
export function getPartnerAnnualIncome(profile: ProfileInputs): number {
  if (profile.planningMode !== 'partner') return 0;

  const bonus = Math.max(0, profile.partnerAnnualBonus);
  const commission = Math.max(0, profile.partnerAnnualCommission);

  if (profile.partnerBaseAnnualSalary != null) {
    return Math.max(0, profile.partnerBaseAnnualSalary) + bonus + commission;
  }

  return Math.max(profile.partnerAnnualIncome, 0);
}

/** Combined household gross used for tax estimates when planning with a partner. */
export function getHouseholdAnnualIncome(profile: ProfileInputs): number {
  const primary = Math.max(profile.annualIncome, 0);
  if (profile.planningMode !== 'partner') return primary;
  return primary + getPartnerAnnualIncome(profile);
}
