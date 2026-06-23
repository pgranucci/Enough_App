import type { BucketItem } from '@/constants/buckets';
import type { IncomeEntryMode, ProfileInputs } from '@/constants/profile';
import {
  DEFAULT_PROFILE_INPUTS,
  FILING_STATUS_OPTIONS,
  getPartnerAnnualIncome,
  normalizeExpenseInputs,
} from '@/constants/profile';
import {
  ageFromPartnerDateOfBirth,
  ageFromProfileDateOfBirth,
  calculateAgeFromDateOfBirth,
  clampAge,
  dateOfBirthFromAge,
  isValidDateOfBirth,
} from '@/utils/profile-age';
import {
  accountsFromLegacyRetirement,
  normalizeFinancialAccounts,
} from '@/constants/financial-accounts';
import type { RetirementInputs } from '@/constants/retirement';
import {
  DEFAULT_RETIREMENT_INPUTS,
  normalizeRetirementExtras,
  retirementExtrasSnapshot,
} from '@/constants/retirement';
import { US_STATES } from '@/constants/us-states';
import {
  normalizeFiniteNumber,
  normalizeNonNegativeFiniteNumber,
  normalizeNullableFiniteNumber,
  normalizeNullableNonNegativeFiniteNumber,
} from '@/utils/numbers';
import type {
  CustomBucketRow,
  ExcessPreferenceRow,
  ProfileRow,
  RetirementPlanRow,
} from '@/types/database';

function normalizeProfileFilingStatus(raw: unknown): ProfileInputs['filingStatus'] {
  return typeof raw === 'string' && FILING_STATUS_OPTIONS.some((option) => option.id === raw)
    ? (raw as ProfileInputs['filingStatus'])
    : DEFAULT_PROFILE_INPUTS.filingStatus;
}

function normalizeProfileState(raw: unknown): ProfileInputs['stateOfResidence'] {
  return typeof raw === 'string' && US_STATES.some((state) => state.code === raw)
    ? (raw as ProfileInputs['stateOfResidence'])
    : DEFAULT_PROFILE_INPUTS.stateOfResidence;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return normalizeNonNegativeFiniteNumber(value, fallback);
}

function nonNegativeNumberOrNull(value: unknown): number | null {
  return normalizeNullableNonNegativeFiniteNumber(value);
}

export function profileRowToInputs(row: ProfileRow | null): ProfileInputs {
  if (!row) return DEFAULT_PROFILE_INPUTS;

  const userAgeRaw = normalizeFiniteNumber(row.user_age, DEFAULT_PROFILE_INPUTS.userAge);
  const partnerAgeRaw = normalizeFiniteNumber(row.partner_age, 0);
  const partnerAnnualIncome = nonNegativeNumber(row.partner_annual_income, 0);
  const userAgeFromRow =
    calculateAgeFromDateOfBirth(row.date_of_birth) ??
    (row.user_age != null ? clampAge(userAgeRaw) : DEFAULT_PROFILE_INPUTS.userAge);

  const partnerDobRaw =
    typeof row.partner_date_of_birth === 'string' ? row.partner_date_of_birth.trim() : '';
  const partnerDateOfBirth =
    partnerDobRaw && isValidDateOfBirth(partnerDobRaw)
      ? partnerDobRaw
      : partnerAgeRaw > 0
        ? dateOfBirthFromAge(partnerAgeRaw)
        : '';

  const partnerAgeFromRow =
    ageFromPartnerDateOfBirth({
      partnerDateOfBirth,
      partnerAge: partnerAgeRaw,
    }) ?? 0;

  return {
    userName: row.user_name?.trim() ?? '',
    partnerName: row.partner_name?.trim() ?? '',
    dateOfBirth: isValidDateOfBirth(row.date_of_birth)
      ? row.date_of_birth
      : dateOfBirthFromAge(userAgeFromRow),
    userAge: userAgeFromRow,
    filingStatus: normalizeProfileFilingStatus(row.filing_status),
    stateOfResidence: normalizeProfileState(row.state_of_residence),
    planningMode:
      row.planning_mode === 'partner' || row.planning_mode === 'solo'
        ? row.planning_mode
        : 'solo',
    annualIncome: nonNegativeNumber(row.annual_income, 0),
    partnerAnnualIncome,
    partnerBaseAnnualSalary:
      row.partner_base_annual_salary != null
        ? nonNegativeNumberOrNull(row.partner_base_annual_salary)
        : row.partner_annual_income != null && partnerAnnualIncome > 0
          ? partnerAnnualIncome
          : null,
    partnerAnnualBonus: nonNegativeNumber(row.partner_annual_bonus, 0),
    partnerAnnualCommission: nonNegativeNumber(row.partner_annual_commission, 0),
    partnerAge: partnerAgeFromRow,
    partnerDateOfBirth,
    onboardingCompleted: row.onboarding_completed ?? false,
    incomeEntryMode: (row.income_entry_mode as IncomeEntryMode | null) ?? null,
    baseAnnualSalary:
      row.base_annual_salary != null ? nonNegativeNumberOrNull(row.base_annual_salary) : null,
    hourlyWage: row.hourly_wage != null ? nonNegativeNumberOrNull(row.hourly_wage) : null,
    averageWeeklyHours:
      row.average_weekly_hours != null ? nonNegativeNumberOrNull(row.average_weekly_hours) : null,
    annualBonus: nonNegativeNumber(row.annual_bonus, 0),
    annualCommission: nonNegativeNumber(row.annual_commission, 0),
    expenses: normalizeExpenseInputs(row.expenses_snapshot),
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  return normalizeFiniteNumber(value, fallback);
}

function finiteNumberOrNull(value: unknown): number | null {
  return normalizeNullableFiniteNumber(value);
}

function finiteNonNegative(value: unknown, fallback: number): number {
  return normalizeNonNegativeFiniteNumber(value, fallback);
}

function finiteNonNegativeOrNull(value: unknown): number | null {
  return normalizeNullableNonNegativeFiniteNumber(value);
}

function normalizeCustomBucketRow(row: CustomBucketRow): BucketItem | null {
  if (!row.bucket || typeof row.bucket !== 'object') return null;
  const bucket = row.bucket as Partial<BucketItem>;

  return {
    ...bucket,
    id: typeof bucket.id === 'string' && bucket.id.trim() ? bucket.id : row.bucket_id,
    name: typeof bucket.name === 'string' && bucket.name.trim() ? bucket.name : 'Custom Goal',
    accent: typeof bucket.accent === 'string' && bucket.accent.trim() ? bucket.accent : '#7C6FD4',
    target: finiteNonNegative(bucket.target, 0),
    current: finiteNonNegative(bucket.current, 0),
    projectedFutureValue: finiteNonNegative(bucket.projectedFutureValue, 0),
    projectedFutureValueReal: finiteNonNegative(bucket.projectedFutureValueReal, 0),
    monthlyContribution: finiteNonNegative(bucket.monthlyContribution, 0),
    estimatedCompletionDate:
      typeof bucket.estimatedCompletionDate === 'string' ? bucket.estimatedCompletionDate : null,
    annualGrowthRate: finiteNumber(bucket.annualGrowthRate, 0),
    annualInflationRate: finiteNumber(bucket.annualInflationRate, 0),
    yearsUntilTarget: finiteNonNegative(bucket.yearsUntilTarget, 0),
    goalHorizonYears:
      bucket.goalHorizonYears == null ? undefined : finiteNonNegative(bucket.goalHorizonYears, 0),
    inflationAdjustedTarget:
      bucket.inflationAdjustedTarget == null
        ? undefined
        : finiteNonNegative(bucket.inflationAdjustedTarget, 0),
    rothGrossEquivalent:
      bucket.rothGrossEquivalent == null
        ? undefined
        : finiteNonNegative(bucket.rothGrossEquivalent, 0),
    projectedGrossEquivalent:
      bucket.projectedGrossEquivalent == null
        ? undefined
        : finiteNonNegative(bucket.projectedGrossEquivalent, 0),
    projectedPortfolioAtRetirement:
      bucket.projectedPortfolioAtRetirement == null
        ? undefined
        : finiteNonNegative(bucket.projectedPortfolioAtRetirement, 0),
    readinessProgress:
      bucket.readinessProgress == null ? undefined : finiteNonNegative(bucket.readinessProgress, 0),
    annualContributions:
      bucket.annualContributions == null ? undefined : finiteNonNegative(bucket.annualContributions, 0),
    retirementMonthlyContributionEmployee:
      bucket.retirementMonthlyContributionEmployee == null
        ? undefined
        : finiteNonNegative(bucket.retirementMonthlyContributionEmployee, 0),
    retirementMonthlyContributionEmployer:
      bucket.retirementMonthlyContributionEmployer == null
        ? undefined
        : finiteNonNegative(bucket.retirementMonthlyContributionEmployer, 0),
    retirementProjectionReturnPercent:
      bucket.retirementProjectionReturnPercent == null
        ? undefined
        : finiteNumber(bucket.retirementProjectionReturnPercent, 0),
  };
}

export function profileInputsToRow(userId: string, inputs: ProfileInputs) {
  const annualIncome = finiteNonNegative(inputs.annualIncome, 0);
  const userAge =
    ageFromProfileDateOfBirth(inputs) ??
    clampAge(finiteNumber(inputs.userAge, DEFAULT_PROFILE_INPUTS.userAge));
  const dateOfBirth = isValidDateOfBirth(inputs.dateOfBirth)
    ? inputs.dateOfBirth
    : dateOfBirthFromAge(userAge);
  const partnerDateOfBirth =
    inputs.planningMode === 'partner' && isValidDateOfBirth(inputs.partnerDateOfBirth)
      ? inputs.partnerDateOfBirth
      : null;
  const partnerAge =
    inputs.planningMode === 'partner'
      ? clampAge(ageFromPartnerDateOfBirth(inputs) ?? finiteNumber(inputs.partnerAge, 0))
      : 0;

  return {
    user_id: userId,
    user_name: inputs.userName.trim() || null,
    partner_name:
      inputs.planningMode === 'partner' ? inputs.partnerName.trim() || null : null,
    date_of_birth: dateOfBirth,
    user_age: userAge,
    filing_status: inputs.filingStatus,
    state_of_residence: inputs.stateOfResidence,
    planning_mode: inputs.planningMode,
    annual_income: annualIncome,
    partner_annual_income:
      inputs.planningMode === 'partner' ? finiteNonNegative(getPartnerAnnualIncome(inputs), 0) : 0,
    partner_base_annual_salary:
      inputs.planningMode === 'partner'
        ? finiteNonNegativeOrNull(inputs.partnerBaseAnnualSalary)
        : null,
    partner_annual_bonus:
      inputs.planningMode === 'partner' ? finiteNonNegative(inputs.partnerAnnualBonus, 0) : 0,
    partner_annual_commission:
      inputs.planningMode === 'partner' ? finiteNonNegative(inputs.partnerAnnualCommission, 0) : 0,
    partner_date_of_birth: partnerDateOfBirth,
    partner_age: partnerAge,
    onboarding_completed: inputs.onboardingCompleted,
    income_entry_mode: inputs.incomeEntryMode,
    base_annual_salary: finiteNonNegativeOrNull(inputs.baseAnnualSalary),
    hourly_wage: finiteNonNegativeOrNull(inputs.hourlyWage),
    average_weekly_hours: finiteNonNegativeOrNull(inputs.averageWeeklyHours),
    annual_bonus: finiteNonNegative(inputs.annualBonus, 0),
    annual_commission: finiteNonNegative(inputs.annualCommission, 0),
    expenses_snapshot: inputs.expenses,
  };
}

export function retirementRowToInputs(row: RetirementPlanRow | null): RetirementInputs {
  if (!row) return DEFAULT_RETIREMENT_INPUTS;

  const d = DEFAULT_RETIREMENT_INPUTS;
  const traditionalBalance = nonNegativeNumber(row.traditional_balance, d.traditionalBalance);
  const rothBalance = nonNegativeNumber(row.roth_balance, d.rothBalance);
  const monthlyContributions = nonNegativeNumber(row.monthly_contributions, d.monthlyContributions);
  const snapshot = row.accounts_snapshot;
  const accounts = Array.isArray(snapshot)
    ? normalizeFinancialAccounts(snapshot)
    : traditionalBalance > 0 || rothBalance > 0 || monthlyContributions > 0
      ? accountsFromLegacyRetirement(traditionalBalance, rothBalance, monthlyContributions)
      : [];

  const hasExplicitAccountList = Array.isArray(snapshot);
  const noAccounts = hasExplicitAccountList && accounts.length === 0;

  const extras = normalizeRetirementExtras(row.retirement_extras);
  const retirementAge = clampAge(normalizeFiniteNumber(row.retirement_age, d.retirementAge));

  return {
    currentAge: clampAge(normalizeFiniteNumber(row.current_age, d.currentAge)),
    retirementAge,
    partnerRetirementAge:
      extras.partnerRetirementAge > 0 ? extras.partnerRetirementAge : retirementAge,
    retirementStateOfResidence: extras.retirementStateOfResidence,
    retirementFilingStatus: extras.retirementFilingStatus,
    desiredAnnualGrossIncome: nonNegativeNumber(
      row.desired_annual_gross_income,
      d.desiredAnnualGrossIncome
    ),
    socialSecurityEstimate: nonNegativeNumber(
      row.social_security_estimate,
      d.socialSecurityEstimate
    ),
    socialSecurityClaimAge: extras.socialSecurityClaimAge,
    socialSecurityMode: extras.socialSecurityMode,
    partnerSocialSecurityEstimate: extras.partnerSocialSecurityEstimate,
    partnerSocialSecurityClaimAge: extras.partnerSocialSecurityClaimAge,
    partnerSocialSecurityMode: extras.partnerSocialSecurityMode,
    otherIncomeStreams: extras.otherIncomeStreams,
    pensionEstimate: nonNegativeNumber(row.pension_estimate, d.pensionEstimate),
    partTimeRetirementIncome: nonNegativeNumber(
      row.part_time_retirement_income,
      d.partTimeRetirementIncome
    ),
    traditionalBalance: noAccounts ? 0 : traditionalBalance,
    rothBalance: noAccounts ? 0 : rothBalance,
    monthlyContributions: noAccounts ? 0 : monthlyContributions,
    expectedAnnualReturn: normalizeFiniteNumber(row.expected_annual_return, d.expectedAnnualReturn),
    inflationAssumption: normalizeFiniteNumber(row.inflation_assumption, d.inflationAssumption),
    assumedCashGrowthRate: extras.assumedCashGrowthRate,
    investmentGrowthMode: extras.investmentGrowthMode,
    customInvestmentGrowthRates: extras.customInvestmentGrowthRates,
    lifeExpectancy: extras.lifeExpectancy,
    partnerLifeExpectancy: extras.partnerLifeExpectancy,
    incomeReplacementPercent: extras.incomeReplacementPercent,
    estimatedRetirementTaxRate: nonNegativeNumber(
      row.estimated_retirement_tax_rate,
      d.estimatedRetirementTaxRate
    ),
    accounts,
  };
}

export function retirementInputsToRow(userId: string, inputs: RetirementInputs) {
  const d = DEFAULT_RETIREMENT_INPUTS;
  return {
    user_id: userId,
    current_age: finiteNumber(inputs.currentAge, d.currentAge),
    retirement_age: finiteNumber(inputs.retirementAge, d.retirementAge),
    desired_annual_gross_income: finiteNonNegative(inputs.desiredAnnualGrossIncome, d.desiredAnnualGrossIncome),
    social_security_estimate: finiteNonNegative(inputs.socialSecurityEstimate, d.socialSecurityEstimate),
    pension_estimate: finiteNonNegative(inputs.pensionEstimate, d.pensionEstimate),
    part_time_retirement_income: finiteNonNegative(
      inputs.partTimeRetirementIncome,
      d.partTimeRetirementIncome
    ),
    traditional_balance: finiteNonNegative(inputs.traditionalBalance, d.traditionalBalance),
    roth_balance: finiteNonNegative(inputs.rothBalance, d.rothBalance),
    monthly_contributions: finiteNonNegative(inputs.monthlyContributions, d.monthlyContributions),
    expected_annual_return: finiteNumber(inputs.expectedAnnualReturn, d.expectedAnnualReturn),
    inflation_assumption: finiteNumber(inputs.inflationAssumption, d.inflationAssumption),
    estimated_retirement_tax_rate: finiteNonNegative(
      inputs.estimatedRetirementTaxRate,
      d.estimatedRetirementTaxRate
    ),
    accounts_snapshot: inputs.accounts,
    retirement_extras: retirementExtrasSnapshot(inputs),
  };
}

export function mapCustomBucketRows(rows: CustomBucketRow[] | null): BucketItem[] {
  return (rows ?? [])
    .sort((a, b) => finiteNumber(a.sort_order, 0) - finiteNumber(b.sort_order, 0))
    .map((row) => normalizeCustomBucketRow(row))
    .filter((bucket): bucket is BucketItem => bucket != null);
}

export function mapExcessPreferences(rows: ExcessPreferenceRow[] | null) {
  const map: Record<string, boolean> = {};
  for (const row of rows ?? []) {
    map[row.bucket_id] = row.included;
  }
  return map;
}
