import type { IncomeEntryMode, PlanningMode } from '@/constants/profile';
import type { ProfileInputs } from '@/constants/profile';
import type { BucketItem } from '@/constants/buckets';
import type { RetirementInputs } from '@/constants/retirement';

export type ProfileRow = {
  user_id: string;
  user_name?: string | null;
  partner_name?: string | null;
  date_of_birth: string;
  user_age?: number | null;
  filing_status: ProfileInputs['filingStatus'];
  state_of_residence: ProfileInputs['stateOfResidence'];
  planning_mode?: PlanningMode | null;
  annual_income: number;
  partner_annual_income?: number | null;
  partner_base_annual_salary?: number | null;
  partner_annual_bonus?: number | null;
  partner_annual_commission?: number | null;
  partner_age?: number | null;
  partner_date_of_birth?: string | null;
  onboarding_completed?: boolean | null;
  income_entry_mode?: IncomeEntryMode | null;
  base_annual_salary?: number | null;
  hourly_wage?: number | null;
  average_weekly_hours?: number | null;
  annual_bonus?: number | null;
  annual_commission?: number | null;
  expenses_snapshot?: unknown;
};

export type RetirementPlanRow = {
  user_id: string;
  current_age: number;
  retirement_age: number;
  desired_annual_gross_income: number;
  social_security_estimate: number;
  pension_estimate: number;
  part_time_retirement_income: number;
  traditional_balance: number;
  roth_balance: number;
  monthly_contributions: number;
  expected_annual_return: number;
  inflation_assumption: number;
  estimated_retirement_tax_rate: number;
  accounts_snapshot?: unknown;
  retirement_extras?: unknown;
};

export type CoreBucketRow = {
  user_id: string;
  bucket_id: string;
  bucket: BucketItem;
};

export type CustomBucketRow = {
  user_id: string;
  bucket_id: string;
  bucket: BucketItem;
  sort_order: number;
};

export type ExcessPreferenceRow = {
  user_id: string;
  bucket_id: string;
  included: boolean;
};

export type UserDataSnapshot = {
  profile: ProfileInputs;
  retirement: RetirementInputs;
  coreBucketOverrides: Record<string, BucketItem>;
  customBuckets: BucketItem[];
  excessIncluded: Record<string, boolean>;
};
