import type { FinancialAccount } from '@/constants/financial-accounts';
import { FILING_STATUS_OPTIONS, type FilingStatus } from '@/constants/profile';
import { US_STATES, type USStateCode } from '@/constants/us-states';
import { normalizeFiniteNumber } from '@/utils/numbers';
import { clampAge } from '@/utils/profile-age';

export type SocialSecurityInputMode = 'calculated' | 'manual' | 'excluded';

export type InvestmentGrowthPreset = 'shortTerm' | 'conservative' | 'balanced' | 'aggressive';

export type InvestmentGrowthMode = InvestmentGrowthPreset | 'custom';

export type CustomInvestmentGrowthRates = Record<InvestmentGrowthPreset, number>;

export const INVESTMENT_GROWTH_PRESET_RATE: CustomInvestmentGrowthRates = {
  shortTerm: 0,
  conservative: 5,
  balanced: 7.5,
  aggressive: 10,
};

export const INVESTMENT_GROWTH_SHORT_TERM_OPTION = {
  label: 'Short-Term',
  rateLabel: '0% annual return',
} as const;

/** Profile → Assumptions fields for each portfolio mix (Short-Term is locked at 0%). */
export const INVESTMENT_GROWTH_ASSUMPTION_FIELDS: {
  key: InvestmentGrowthPreset;
  label: string;
  placeholder: string;
  locked: boolean;
}[] = [
  {
    key: 'shortTerm',
    label: 'Short-Term',
    placeholder: String(INVESTMENT_GROWTH_PRESET_RATE.shortTerm),
    locked: true,
  },
  {
    key: 'conservative',
    label: 'Conservative',
    placeholder: String(INVESTMENT_GROWTH_PRESET_RATE.conservative),
    locked: false,
  },
  {
    key: 'balanced',
    label: 'Balanced',
    placeholder: String(INVESTMENT_GROWTH_PRESET_RATE.balanced),
    locked: false,
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    placeholder: String(INVESTMENT_GROWTH_PRESET_RATE.aggressive),
    locked: false,
  },
];

export const DEFAULT_CUSTOM_INVESTMENT_GROWTH_RATES: CustomInvestmentGrowthRates = {
  ...INVESTMENT_GROWTH_PRESET_RATE,
};

export const INVESTMENT_GROWTH_PRESET_OPTIONS: {
  id: InvestmentGrowthMode;
  label: string;
  rateLabel: string;
}[] = [
  { id: 'conservative', label: 'Conservative', rateLabel: '5% annual return' },
  { id: 'balanced', label: 'Balanced', rateLabel: '7.5% annual return' },
  { id: 'aggressive', label: 'Aggressive', rateLabel: '10% annual return' },
  { id: 'custom', label: 'Custom', rateLabel: 'Your own rate' },
];

export const DEFAULT_INFLATION_ASSUMPTION = 2.5;
export const DEFAULT_RETIREMENT_INVESTMENT_RETURN = 7.5;
export const DEFAULT_LIFE_EXPECTANCY = 95;

export function normalizeLifeExpectancy(raw: unknown): number {
  const life = clampAge(normalizeFiniteNumber(raw, 0));
  return life > 0 ? life : DEFAULT_LIFE_EXPECTANCY;
}

/** Empty when unset or still at the default (placeholder shows 95). */
export function lifeExpectancyInputValue(stored: number): string {
  const life = clampAge(stored);
  if (life <= 0 || life === DEFAULT_LIFE_EXPECTANCY) return '';
  return String(life);
}

export type OtherIncomeStreamAssignee = 'self' | 'partner';

export type RetirementOtherIncomeStream = {
  id: string;
  name: string;
  monthlyGross: number;
  startAge: number;
  endAge: number;
  assignedTo: OtherIncomeStreamAssignee;
  /** W-2 / self-employment wages subject to FICA payroll tax. */
  isWorkInRetirement: boolean;
};

function normalizeRetirementStateCode(raw: unknown, fallback: USStateCode): USStateCode {
  if (typeof raw === 'string' && US_STATES.some((state) => state.code === raw)) {
    return raw as USStateCode;
  }
  return fallback;
}

function normalizeRetirementFilingStatus(raw: unknown, fallback: FilingStatus): FilingStatus {
  if (
    typeof raw === 'string' &&
    FILING_STATUS_OPTIONS.some((option) => option.id === raw)
  ) {
    return raw as FilingStatus;
  }
  return fallback;
}

export type RetirementInputs = {
  currentAge: number;
  retirementAge: number;
  partnerRetirementAge: number;
  /** Expected state of residence in retirement (for net income tax estimates). */
  retirementStateOfResidence: USStateCode;
  /** Tax filing status in retirement (for net income tax estimates). */
  retirementFilingStatus: FilingStatus;
  desiredAnnualGrossIncome: number;
  /** Share of household gross income to replace in retirement (0–200%). */
  incomeReplacementPercent: number;
  socialSecurityEstimate: number;
  socialSecurityClaimAge: number;
  socialSecurityMode: SocialSecurityInputMode;
  partnerSocialSecurityEstimate: number;
  partnerSocialSecurityClaimAge: number;
  partnerSocialSecurityMode: SocialSecurityInputMode;
  otherIncomeStreams: RetirementOtherIncomeStream[];
  pensionEstimate: number;
  partTimeRetirementIncome: number;
  traditionalBalance: number;
  rothBalance: number;
  monthlyContributions: number;
  expectedAnnualReturn: number;
  inflationAssumption: number;
  assumedCashGrowthRate: number;
  investmentGrowthMode: InvestmentGrowthMode;
  customInvestmentGrowthRates: CustomInvestmentGrowthRates;
  lifeExpectancy: number;
  partnerLifeExpectancy: number;
  estimatedRetirementTaxRate: number;
  accounts: FinancialAccount[];
};

export const DEFAULT_RETIREMENT_INPUTS: RetirementInputs = {
  currentAge: 35,
  retirementAge: 65,
  partnerRetirementAge: 65,
  retirementStateOfResidence: 'CA',
  retirementFilingStatus: 'single',
  desiredAnnualGrossIncome: 120000,
  incomeReplacementPercent: 100,
  socialSecurityEstimate: 32000,
  socialSecurityClaimAge: 67,
  socialSecurityMode: 'calculated',
  partnerSocialSecurityEstimate: 0,
  partnerSocialSecurityClaimAge: 67,
  partnerSocialSecurityMode: 'calculated',
  otherIncomeStreams: [],
  pensionEstimate: 0,
  partTimeRetirementIncome: 0,
  traditionalBalance: 0,
  rothBalance: 0,
  monthlyContributions: 0,
  expectedAnnualReturn: DEFAULT_RETIREMENT_INVESTMENT_RETURN,
  inflationAssumption: DEFAULT_INFLATION_ASSUMPTION,
  assumedCashGrowthRate: 0,
  investmentGrowthMode: 'custom',
  customInvestmentGrowthRates: { ...DEFAULT_CUSTOM_INVESTMENT_GROWTH_RATES },
  lifeExpectancy: DEFAULT_LIFE_EXPECTANCY,
  partnerLifeExpectancy: DEFAULT_LIFE_EXPECTANCY,
  estimatedRetirementTaxRate: 22,
  accounts: [],
};

export function newRetirementOtherIncomeStream(): RetirementOtherIncomeStream {
  return {
    id: `income-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    monthlyGross: 0,
    startAge: 65,
    endAge: 90,
    assignedTo: 'self',
    isWorkInRetirement: false,
  };
}

function clampMoney(n: unknown): number {
  const x = normalizeFiniteNumber(n, 0);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

export function normalizeOtherIncomeStreams(raw: unknown): RetirementOtherIncomeStream[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      return {
        id: typeof r.id === 'string' ? r.id : `income-${i}`,
        name: typeof r.name === 'string' ? r.name : '',
        monthlyGross: clampMoney(r.monthlyGross),
        startAge: clampAge(normalizeFiniteNumber(r.startAge, 0)),
        endAge: clampAge(normalizeFiniteNumber(r.endAge, 0)),
        assignedTo: r.assignedTo === 'partner' ? 'partner' : 'self',
        isWorkInRetirement: r.isWorkInRetirement === true,
      };
    })
    .filter((row): row is RetirementOtherIncomeStream => row != null);
}

function clampPercent(n: unknown, fallback: number): number {
  const x = normalizeFiniteNumber(n, fallback);
  return Math.min(30, Math.max(0, x));
}

export function normalizeCustomInvestmentGrowthRates(
  raw: unknown,
  legacySingleRate?: unknown
): CustomInvestmentGrowthRates {
  const d = DEFAULT_CUSTOM_INVESTMENT_GROWTH_RATES;
  const legacyRaw = normalizeFiniteNumber(legacySingleRate, Number.NaN);
  const legacyFallback = Number.isFinite(legacyRaw) ? legacyRaw : undefined;

  if (!raw || typeof raw !== 'object') {
    if (legacyFallback != null) {
      return {
        shortTerm: 0,
        conservative: legacyFallback,
        balanced: legacyFallback,
        aggressive: legacyFallback,
      };
    }
    return { ...d };
  }

  const o = raw as Record<string, unknown>;
  return {
    shortTerm: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
    conservative: clampPercent(o.conservative, legacyFallback ?? d.conservative),
    balanced: clampPercent(o.balanced, legacyFallback ?? d.balanced),
    aggressive: clampPercent(o.aggressive, legacyFallback ?? d.aggressive),
  };
}

/** Effective annual return % for a portfolio mix (defaults when unset). */
export function portfolioGrowthRate(
  key: InvestmentGrowthPreset,
  rates: CustomInvestmentGrowthRates
): number {
  if (key === 'shortTerm') {
    return INVESTMENT_GROWTH_PRESET_RATE.shortTerm;
  }
  const stored = rates[key];
  const defaultRate = INVESTMENT_GROWTH_PRESET_RATE[key];
  return stored > 0 ? stored : defaultRate;
}

/** Return % for a portfolio mix from per-mix assumption overrides. */
export function investmentGrowthRateForMix(
  mix: InvestmentGrowthPreset,
  _mode: InvestmentGrowthMode,
  customRates: CustomInvestmentGrowthRates
): number {
  return portfolioGrowthRate(mix, customRates);
}

/** Annual return % for Short-Term / cash holdings (always 0%). */
export function shortTermGrowthRate(): number {
  return INVESTMENT_GROWTH_PRESET_RATE.shortTerm;
}

export const RETIREMENT_TAX_LOCATION_INFO =
  'Where you expect to live and how you will file taxes in retirement. Used to estimate net income from your desired gross retirement income and the value of Roth vs pre-tax savings.';

export type RetirementExtrasSnapshot = Pick<
  RetirementInputs,
  | 'partnerRetirementAge'
  | 'retirementStateOfResidence'
  | 'retirementFilingStatus'
  | 'socialSecurityClaimAge'
  | 'socialSecurityMode'
  | 'partnerSocialSecurityEstimate'
  | 'partnerSocialSecurityClaimAge'
  | 'partnerSocialSecurityMode'
  | 'otherIncomeStreams'
  | 'assumedCashGrowthRate'
  | 'investmentGrowthMode'
  | 'customInvestmentGrowthRates'
  | 'lifeExpectancy'
  | 'partnerLifeExpectancy'
  | 'incomeReplacementPercent'
>;

export function normalizeRetirementExtras(raw: unknown): RetirementExtrasSnapshot {
  const d = DEFAULT_RETIREMENT_INPUTS;
  if (!raw || typeof raw !== 'object') {
    return {
      partnerRetirementAge: d.partnerRetirementAge,
      retirementStateOfResidence: d.retirementStateOfResidence,
      retirementFilingStatus: d.retirementFilingStatus,
      socialSecurityClaimAge: d.socialSecurityClaimAge,
      socialSecurityMode: d.socialSecurityMode,
      partnerSocialSecurityEstimate: d.partnerSocialSecurityEstimate,
      partnerSocialSecurityClaimAge: d.partnerSocialSecurityClaimAge,
      partnerSocialSecurityMode: d.partnerSocialSecurityMode,
      otherIncomeStreams: [],
      assumedCashGrowthRate: d.assumedCashGrowthRate,
      investmentGrowthMode: 'custom',
      customInvestmentGrowthRates: { ...d.customInvestmentGrowthRates },
      lifeExpectancy: d.lifeExpectancy,
      partnerLifeExpectancy: d.partnerLifeExpectancy,
      incomeReplacementPercent: d.incomeReplacementPercent,
    };
  }

  const o = raw as Record<string, unknown>;
  const mode = normalizeSocialSecurityMode(o.socialSecurityMode);
  const partnerMode = normalizeSocialSecurityMode(o.partnerSocialSecurityMode);
  return {
    partnerRetirementAge: clampAge(
      normalizeFiniteNumber(o.partnerRetirementAge, d.partnerRetirementAge)
    ),
    retirementStateOfResidence: normalizeRetirementStateCode(
      o.retirementStateOfResidence,
      d.retirementStateOfResidence
    ),
    retirementFilingStatus: normalizeRetirementFilingStatus(
      o.retirementFilingStatus,
      d.retirementFilingStatus
    ),
    socialSecurityClaimAge: clampAge(
      normalizeFiniteNumber(o.socialSecurityClaimAge, d.socialSecurityClaimAge)
    ),
    socialSecurityMode: mode,
    partnerSocialSecurityEstimate: clampMoney(o.partnerSocialSecurityEstimate),
    partnerSocialSecurityClaimAge: clampAge(
      normalizeFiniteNumber(o.partnerSocialSecurityClaimAge, d.partnerSocialSecurityClaimAge)
    ),
    partnerSocialSecurityMode: partnerMode,
    otherIncomeStreams: normalizeOtherIncomeStreams(o.otherIncomeStreams),
    assumedCashGrowthRate: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
    investmentGrowthMode: 'custom',
    customInvestmentGrowthRates: normalizeCustomInvestmentGrowthRates(
      o.customInvestmentGrowthRates,
      o.customInvestmentGrowthRate
    ),
    lifeExpectancy: normalizeLifeExpectancy(o.lifeExpectancy),
    partnerLifeExpectancy: normalizeLifeExpectancy(o.partnerLifeExpectancy),
    incomeReplacementPercent: (() => {
      const raw = normalizeFiniteNumber(o.incomeReplacementPercent, d.incomeReplacementPercent);
      return Math.min(200, Math.max(0, Math.round(raw)));
    })(),
  };
}

export function retirementExtrasSnapshot(inputs: RetirementInputs): RetirementExtrasSnapshot {
  return {
    partnerRetirementAge: inputs.partnerRetirementAge,
    retirementStateOfResidence: inputs.retirementStateOfResidence,
    retirementFilingStatus: inputs.retirementFilingStatus,
    socialSecurityClaimAge: inputs.socialSecurityClaimAge,
    socialSecurityMode: inputs.socialSecurityMode,
    partnerSocialSecurityEstimate: inputs.partnerSocialSecurityEstimate,
    partnerSocialSecurityClaimAge: inputs.partnerSocialSecurityClaimAge,
    partnerSocialSecurityMode: inputs.partnerSocialSecurityMode,
    otherIncomeStreams: inputs.otherIncomeStreams,
    assumedCashGrowthRate: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
    investmentGrowthMode: 'custom',
    customInvestmentGrowthRates: {
      ...inputs.customInvestmentGrowthRates,
      shortTerm: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
    },
    lifeExpectancy: inputs.lifeExpectancy,
    partnerLifeExpectancy: inputs.partnerLifeExpectancy,
    incomeReplacementPercent: inputs.incomeReplacementPercent,
  };
}

export type RetirementInputKey = Exclude<
  keyof RetirementInputs,
  | 'accounts'
  | 'otherIncomeStreams'
  | 'socialSecurityMode'
  | 'partnerSocialSecurityMode'
  | 'investmentGrowthMode'
>;

export type RetirementFieldConfig = {
  key: RetirementInputKey;
  label: string;
  placeholder: string;
  suffix?: '$' | '%' | 'yrs';
  infoMessage?: string;
};

export const RETIREMENT_ASSUMPTION_FIELDS: RetirementFieldConfig[] = [
  {
    key: 'expectedAnnualReturn',
    label: 'Expected annual investment return',
    placeholder: '7',
    suffix: '%',
  },
  {
    key: 'inflationAssumption',
    label: 'Inflation assumption',
    placeholder: '3',
    suffix: '%',
  },
];

export function normalizeSocialSecurityMode(raw: unknown): SocialSecurityInputMode {
  if (raw === 'manual') return 'manual';
  if (raw === 'excluded') return 'excluded';
  return 'calculated';
}

export const SOCIAL_SECURITY_MODE_OPTIONS: { id: SocialSecurityInputMode; label: string }[] = [
  { id: 'calculated', label: 'Estimate' },
  { id: 'manual', label: 'Enter Amount' },
  { id: 'excluded', label: 'Exclude' },
];
