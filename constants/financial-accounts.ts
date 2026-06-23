import { normalizeFiniteNumber } from '@/utils/numbers';

export type FinancialAccountType = 'retirement' | 'savings' | 'brokerage';

export type InvestmentMix = 'cash' | 'conservative' | 'balanced' | 'aggressive';

/** Whose income funds employer-plan deferrals when planning with a partner. */
export type AccountOwner = 'self' | 'partner';

export type FinancialAccount = {
  id: string;
  accountType: FinancialAccountType;
  /** Primary earner vs partner — used for 401(k) % deferrals when planning together. */
  accountOwner: AccountOwner;
  name: string;
  institution: string;
  /** Total balance; for employer plans equals preTaxCurrentValue + rothCurrentValue. */
  currentValue: number;
  preTaxCurrentValue: number;
  rothCurrentValue: number;
  estimatedAnnualSavings: number;
  investmentMix: InvestmentMix | null;
  isEmployerPlan: boolean;
  isRoth: boolean;
  employeePreTaxContributionPercent: number;
  employeeRothContributionPercent: number;
  employerMatchPercent: number;
  employerProfitSharingPercent: number;
  annualContributionDollars: number;
};

export const FINANCIAL_ACCOUNT_TYPE_OPTIONS: {
  id: FinancialAccountType;
  label: string;
}[] = [
  { id: 'retirement', label: 'Retirement Account' },
  { id: 'savings', label: 'Savings Account' },
  { id: 'brokerage', label: 'Brokerage Account' },
];

export const INVESTMENT_MIX_INFO_MESSAGE =
  'Short Term is fixed at 0% annual return (Profile → Assumptions).\n\n' +
  'Conservative, Balanced, and Aggressive use the growth rates you set under Profile → Assumptions (defaults: 5%, 7.5%, and 10%).';

export const INVESTMENT_MIX_OPTIONS: {
  id: InvestmentMix;
  label: string;
}[] = [
  { id: 'cash', label: 'Short Term' },
  { id: 'conservative', label: 'Conservative' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'aggressive', label: 'Aggressive' },
];

const DEFAULT_INVESTMENT_MIX_INDEX = INVESTMENT_MIX_OPTIONS.findIndex((o) => o.id === 'balanced');

export function investmentMixIndex(mix: InvestmentMix | null): number {
  if (!mix) return DEFAULT_INVESTMENT_MIX_INDEX >= 0 ? DEFAULT_INVESTMENT_MIX_INDEX : 2;
  const index = INVESTMENT_MIX_OPTIONS.findIndex((option) => option.id === mix);
  return index >= 0 ? index : 2;
}

export function investmentMixFromIndex(index: number): InvestmentMix {
  const clamped = Math.min(
    INVESTMENT_MIX_OPTIONS.length - 1,
    Math.max(0, Math.round(index))
  );
  return INVESTMENT_MIX_OPTIONS[clamped]!.id;
}

/** Expected annual return % by mix for portfolio projections. */
export const INVESTMENT_MIX_RETURN_PERCENT: Record<InvestmentMix, number> = {
  cash: 2,
  conservative: 5,
  balanced: 7,
  aggressive: 9,
};

export function createEmptyFinancialAccount(
  accountType: FinancialAccountType = 'retirement'
): FinancialAccount {
  return {
    id: `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    accountType,
    accountOwner: 'self',
    name: '',
    institution: '',
    currentValue: 0,
    preTaxCurrentValue: 0,
    rothCurrentValue: 0,
    estimatedAnnualSavings: 0,
    investmentMix: accountType === 'savings' ? 'cash' : 'balanced',
    isEmployerPlan: false,
    isRoth: false,
    employeePreTaxContributionPercent: 0,
    employeeRothContributionPercent: 0,
    employerMatchPercent: 0,
    employerProfitSharingPercent: 0,
    annualContributionDollars: 0,
  };
}

/** Pre-tax portion of balance (employer plan uses split fields; IRA uses currentValue + isRoth). */
export function accountPreTaxBalance(account: FinancialAccount): number {
  if (account.accountType !== 'retirement') {
    return Math.max(account.currentValue, 0);
  }
  if (account.isEmployerPlan) {
    return Math.max(account.preTaxCurrentValue, 0);
  }
  return account.isRoth ? 0 : Math.max(account.currentValue, 0);
}

/** Roth portion of balance. */
export function accountRothBalance(account: FinancialAccount): number {
  if (account.accountType !== 'retirement') return 0;
  if (account.isEmployerPlan) {
    return Math.max(account.rothCurrentValue, 0);
  }
  return account.isRoth ? Math.max(account.currentValue, 0) : 0;
}

export function accountTotalBalance(account: FinancialAccount): number {
  if (account.accountType === 'retirement' && account.isEmployerPlan) {
    return accountPreTaxBalance(account) + accountRothBalance(account);
  }
  return Math.max(account.currentValue, 0);
}

export function withEmployerPlanBalancePatch(
  account: FinancialAccount,
  patch: Partial<Pick<FinancialAccount, 'preTaxCurrentValue' | 'rothCurrentValue'>>
): Pick<FinancialAccount, 'preTaxCurrentValue' | 'rothCurrentValue' | 'currentValue'> {
  const preTaxCurrentValue = patch.preTaxCurrentValue ?? account.preTaxCurrentValue;
  const rothCurrentValue = patch.rothCurrentValue ?? account.rothCurrentValue;
  return {
    preTaxCurrentValue,
    rothCurrentValue,
    currentValue: preTaxCurrentValue + rothCurrentValue,
  };
}

function normalizeEmployerPlanBalances(
  row: Record<string, unknown>,
  isEmployerPlan: boolean
): Pick<FinancialAccount, 'currentValue' | 'preTaxCurrentValue' | 'rothCurrentValue'> {
  const legacyValue = clampMoney(row.currentValue);
  const isRoth = Boolean(row.isRoth);

  if (!isEmployerPlan) {
    return {
      currentValue: legacyValue,
      preTaxCurrentValue: 0,
      rothCurrentValue: 0,
    };
  }

  const hasSplit =
    row.preTaxCurrentValue !== undefined || row.rothCurrentValue !== undefined;

  if (hasSplit) {
    const preTaxCurrentValue = clampMoney(row.preTaxCurrentValue);
    const rothCurrentValue = clampMoney(row.rothCurrentValue);
    return {
      preTaxCurrentValue,
      rothCurrentValue,
      currentValue: preTaxCurrentValue + rothCurrentValue,
    };
  }

  if (legacyValue > 0) {
    return isRoth
      ? { currentValue: legacyValue, preTaxCurrentValue: 0, rothCurrentValue: legacyValue }
      : { currentValue: legacyValue, preTaxCurrentValue: legacyValue, rothCurrentValue: 0 };
  }

  return { currentValue: 0, preTaxCurrentValue: 0, rothCurrentValue: 0 };
}

function normalizeEmployeeContributionPercents(row: Record<string, unknown>): {
  employeePreTaxContributionPercent: number;
  employeeRothContributionPercent: number;
} {
  const legacy = clampPercent(row.employeeContributionPercent);
  const hasSplit =
    row.employeePreTaxContributionPercent !== undefined ||
    row.employeeRothContributionPercent !== undefined;

  if (hasSplit) {
    return {
      employeePreTaxContributionPercent: clampPercent(row.employeePreTaxContributionPercent),
      employeeRothContributionPercent: clampPercent(row.employeeRothContributionPercent),
    };
  }

  if (legacy > 0 && Boolean(row.isRoth)) {
    return {
      employeePreTaxContributionPercent: 0,
      employeeRothContributionPercent: legacy,
    };
  }

  return {
    employeePreTaxContributionPercent: legacy,
    employeeRothContributionPercent: 0,
  };
}

function clampPercent(n: unknown): number {
  const x = normalizeFiniteNumber(n, 0);
  return Math.min(100, Math.max(0, x));
}

function clampMoney(n: unknown): number {
  const x = normalizeFiniteNumber(n, 0);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

export function normalizeFinancialAccounts(raw: unknown): FinancialAccount[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((row, i): FinancialAccount | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const accountType =
        r.accountType === 'retirement' ||
        r.accountType === 'savings' ||
        r.accountType === 'brokerage'
          ? r.accountType
          : 'retirement';

      const investmentMixRaw = r.investmentMix;
      let investmentMix: InvestmentMix =
        investmentMixRaw === 'cash' ||
        investmentMixRaw === 'conservative' ||
        investmentMixRaw === 'balanced' ||
        investmentMixRaw === 'aggressive'
          ? investmentMixRaw
          : 'balanced';
      if (accountType === 'savings') {
        investmentMix = 'cash';
      }

      const isEmployerPlan = Boolean(r.isEmployerPlan);

      return {
        id: typeof r.id === 'string' ? r.id : `acct-${i}`,
        accountType,
        accountOwner: r.accountOwner === 'partner' ? 'partner' : 'self',
        name: typeof r.name === 'string' ? r.name : '',
        institution: typeof r.institution === 'string' ? r.institution : '',
        ...normalizeEmployerPlanBalances(r, isEmployerPlan),
        estimatedAnnualSavings: clampMoney(r.estimatedAnnualSavings),
        investmentMix,
        isEmployerPlan,
        isRoth: Boolean(r.isRoth),
        ...normalizeEmployeeContributionPercents(r),
        employerMatchPercent: clampPercent(r.employerMatchPercent),
        employerProfitSharingPercent: clampPercent(r.employerProfitSharingPercent),
        annualContributionDollars: clampMoney(r.annualContributionDollars),
      };
    })
    .filter((row): row is FinancialAccount => row != null);
}

export function accountsFromLegacyRetirement(
  traditionalBalance: number,
  rothBalance: number,
  monthlyContributions: number
): FinancialAccount[] {
  const accounts: FinancialAccount[] = [];
  const monthly = Math.max(monthlyContributions, 0);
  const annual = monthly * 12;

  if (traditionalBalance > 0 || monthly > 0) {
    accounts.push({
      ...createEmptyFinancialAccount('retirement'),
      accountOwner: 'self',
      id: 'legacy-traditional',
      name: 'Traditional retirement',
      currentValue: traditionalBalance,
      estimatedAnnualSavings: annual,
      isRoth: false,
      annualContributionDollars: annual,
    });
  }

  if (rothBalance > 0) {
    accounts.push({
      ...createEmptyFinancialAccount('retirement'),
      accountOwner: 'self',
      id: 'legacy-roth',
      name: 'Roth retirement',
      currentValue: rothBalance,
      estimatedAnnualSavings: 0,
      isRoth: true,
    });
  }

  return accounts;
}
