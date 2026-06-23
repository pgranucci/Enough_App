import type { FilingStatus } from '@/constants/profile';
import type { USStateCode } from '@/constants/us-states';

type BracketSlice = { upTo: number; rate: number };

type StateTaxModel =
  | { type: 'none' }
  | {
      type: 'flat';
      rate: number;
      deduction?: Partial<Record<FilingStatus, number>>;
    }
  | {
      type: 'brackets';
      deduction: Partial<Record<FilingStatus, number>>;
      brackets: Partial<Record<FilingStatus, BracketSlice[]>>;
    };

const NO_INCOME_TAX_STATES = new Set<USStateCode>([
  'AK',
  'FL',
  'NV',
  'NH',
  'SD',
  'TN',
  'TX',
  'WA',
  'WY',
]);

const FLAT_STATE_RATES: Partial<Record<USStateCode, number>> = {
  AL: 0.05,
  AZ: 0.025,
  AR: 0.039,
  CO: 0.044,
  GA: 0.0539,
  ID: 0.058,
  IL: 0.0495,
  IN: 0.03,
  IA: 0.038,
  KS: 0.052,
  KY: 0.04,
  LA: 0.03,
  MA: 0.05,
  MI: 0.0425,
  MS: 0.044,
  MO: 0.048,
  MT: 0.059,
  NE: 0.052,
  NC: 0.0425,
  ND: 0.0195,
  OH: 0.035,
  OK: 0.0475,
  PA: 0.0307,
  RI: 0.0475,
  SC: 0.062,
  UT: 0.0455,
  VA: 0.0575,
  WV: 0.0512,
  WI: 0.053,
};

const CA_BRACKETS_SINGLE: BracketSlice[] = [
  { upTo: 10756, rate: 0.01 },
  { upTo: 25499, rate: 0.02 },
  { upTo: 40245, rate: 0.04 },
  { upTo: 55866, rate: 0.06 },
  { upTo: 70606, rate: 0.08 },
  { upTo: 360659, rate: 0.093 },
  { upTo: 432787, rate: 0.103 },
  { upTo: 721314, rate: 0.113 },
  { upTo: 1000000, rate: 0.123 },
  { upTo: Infinity, rate: 0.133 },
];

const CA_BRACKETS_MFJ: BracketSlice[] = [
  { upTo: 21512, rate: 0.01 },
  { upTo: 50998, rate: 0.02 },
  { upTo: 80490, rate: 0.04 },
  { upTo: 111732, rate: 0.06 },
  { upTo: 141212, rate: 0.08 },
  { upTo: 721318, rate: 0.093 },
  { upTo: 865574, rate: 0.103 },
  { upTo: 1000000, rate: 0.113 },
  { upTo: 1442628, rate: 0.123 },
  { upTo: Infinity, rate: 0.133 },
];

const NY_BRACKETS_SINGLE: BracketSlice[] = [
  { upTo: 8500, rate: 0.04 },
  { upTo: 11700, rate: 0.045 },
  { upTo: 13900, rate: 0.0525 },
  { upTo: 80650, rate: 0.055 },
  { upTo: 215400, rate: 0.06 },
  { upTo: 1077550, rate: 0.0685 },
  { upTo: 5000000, rate: 0.0965 },
  { upTo: 25000000, rate: 0.103 },
  { upTo: Infinity, rate: 0.109 },
];

const NY_BRACKETS_MFJ: BracketSlice[] = [
  { upTo: 17150, rate: 0.04 },
  { upTo: 23600, rate: 0.045 },
  { upTo: 27900, rate: 0.0525 },
  { upTo: 161550, rate: 0.055 },
  { upTo: 323200, rate: 0.06 },
  { upTo: 2155350, rate: 0.0685 },
  { upTo: 5000000, rate: 0.0965 },
  { upTo: 25000000, rate: 0.103 },
  { upTo: Infinity, rate: 0.109 },
];

const PROGRESSIVE_STATE_CONFIG: Partial<Record<USStateCode, StateTaxModel>> = {
  CA: {
    type: 'brackets',
    deduction: { single: 5540, married_joint: 11080, married_separate: 5540, head_of_household: 11080 },
    brackets: {
      single: CA_BRACKETS_SINGLE,
      married_joint: CA_BRACKETS_MFJ,
      married_separate: CA_BRACKETS_SINGLE,
      head_of_household: CA_BRACKETS_SINGLE,
    },
  },
  NY: {
    type: 'brackets',
    deduction: { single: 8000, married_joint: 16050, married_separate: 8000, head_of_household: 11200 },
    brackets: {
      single: NY_BRACKETS_SINGLE,
      married_joint: NY_BRACKETS_MFJ,
      married_separate: NY_BRACKETS_SINGLE,
      head_of_household: NY_BRACKETS_SINGLE,
    },
  },
  NJ: {
    type: 'brackets',
    deduction: { single: 1000, married_joint: 2000, married_separate: 1000, head_of_household: 1500 },
    brackets: {
      single: [
        { upTo: 20000, rate: 0.014 },
        { upTo: 35000, rate: 0.0175 },
        { upTo: 40000, rate: 0.035 },
        { upTo: 75000, rate: 0.0525 },
        { upTo: 500000, rate: 0.0637 },
        { upTo: 1000000, rate: 0.0897 },
        { upTo: Infinity, rate: 0.1075 },
      ],
    },
  },
  OR: {
    type: 'brackets',
    deduction: { single: 2740, married_joint: 5480, married_separate: 2740, head_of_household: 5480 },
    brackets: {
      single: [
        { upTo: 4300, rate: 0.0475 },
        { upTo: 10750, rate: 0.0675 },
        { upTo: 125000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
    },
  },
  HI: {
    type: 'brackets',
    deduction: { single: 2200, married_joint: 4400, married_separate: 2200, head_of_household: 3300 },
    brackets: {
      single: [
        { upTo: 9600, rate: 0.014 },
        { upTo: 14400, rate: 0.032 },
        { upTo: 19200, rate: 0.055 },
        { upTo: 24000, rate: 0.064 },
        { upTo: 36000, rate: 0.068 },
        { upTo: 48000, rate: 0.072 },
        { upTo: 150000, rate: 0.076 },
        { upTo: 175000, rate: 0.079 },
        { upTo: 200000, rate: 0.0825 },
        { upTo: Infinity, rate: 0.11 },
      ],
    },
  },
  CT: {
    type: 'brackets',
    deduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    brackets: {
      single: [
        { upTo: 10000, rate: 0.02 },
        { upTo: 50000, rate: 0.045 },
        { upTo: 100000, rate: 0.055 },
        { upTo: 200000, rate: 0.06 },
        { upTo: 250000, rate: 0.065 },
        { upTo: 500000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
    },
  },
  MD: {
    type: 'brackets',
    deduction: { single: 2550, married_joint: 5150, married_separate: 2550, head_of_household: 5150 },
    brackets: {
      single: [
        { upTo: 1000, rate: 0.02 },
        { upTo: 2000, rate: 0.03 },
        { upTo: 3000, rate: 0.04 },
        { upTo: 100000, rate: 0.0475 },
        { upTo: 125000, rate: 0.05 },
        { upTo: 150000, rate: 0.0525 },
        { upTo: 250000, rate: 0.055 },
        { upTo: Infinity, rate: 0.0575 },
      ],
    },
  },
  MN: {
    type: 'brackets',
    deduction: { single: 14950, married_joint: 29900, married_separate: 14950, head_of_household: 22400 },
    brackets: {
      single: [
        { upTo: 32570, rate: 0.0535 },
        { upTo: 106990, rate: 0.068 },
        { upTo: 198630, rate: 0.0785 },
        { upTo: Infinity, rate: 0.0985 },
      ],
    },
  },
  VT: {
    type: 'brackets',
    deduction: { single: 7350, married_joint: 14700, married_separate: 7350, head_of_household: 11000 },
    brackets: {
      single: [
        { upTo: 47900, rate: 0.0335 },
        { upTo: 116000, rate: 0.066 },
        { upTo: 242000, rate: 0.076 },
        { upTo: Infinity, rate: 0.0875 },
      ],
    },
  },
  DC: {
    type: 'brackets',
    deduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    brackets: {
      single: [
        { upTo: 10000, rate: 0.04 },
        { upTo: 40000, rate: 0.06 },
        { upTo: 60000, rate: 0.065 },
        { upTo: 250000, rate: 0.085 },
        { upTo: 500000, rate: 0.0925 },
        { upTo: 1000000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
    },
  },
};

function getStateModel(state: USStateCode): StateTaxModel {
  if (NO_INCOME_TAX_STATES.has(state)) {
    return { type: 'none' };
  }

  const progressive = PROGRESSIVE_STATE_CONFIG[state];
  if (progressive) {
    return progressive;
  }

  const flatRate = FLAT_STATE_RATES[state];
  if (flatRate != null) {
    return { type: 'flat', rate: flatRate };
  }

  return { type: 'flat', rate: 0.05 };
}

function getBracketsForStatus(
  brackets: Partial<Record<FilingStatus, BracketSlice[]>>,
  filingStatus: FilingStatus
) {
  return brackets[filingStatus] ?? brackets.single ?? [];
}

function getDeductionForStatus(
  deduction: Partial<Record<FilingStatus, number>> | undefined,
  filingStatus: FilingStatus
) {
  return deduction?.[filingStatus] ?? deduction?.single ?? 0;
}

function calculateTaxFromBrackets(taxableIncome: number, brackets: BracketSlice[]) {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= previousLimit) break;

    const incomeInBracket = Math.min(taxableIncome, bracket.upTo) - previousLimit;
    tax += incomeInBracket * bracket.rate;
    previousLimit = bracket.upTo;

    if (taxableIncome <= bracket.upTo) break;
  }

  return tax;
}

function getMarginalRateFromBrackets(taxableIncome: number, brackets: BracketSlice[]) {
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.upTo) {
      return bracket.rate;
    }
  }

  return brackets[brackets.length - 1]?.rate ?? 0;
}

export type StateIncomeTaxResult = {
  applies: boolean;
  stateName: string;
  taxableIncome: number;
  estimatedStateTax: number;
  estimatedMarginalRate: number;
  estimatedStateBracketLabel: string;
};

export function calculateStateIncomeTax(
  state: USStateCode,
  filingStatus: FilingStatus,
  grossIncome: number,
  federalTaxableIncome: number
): StateIncomeTaxResult {
  const model = getStateModel(state);
  const taxableBase = Math.max(federalTaxableIncome, 0);

  if (model.type === 'none') {
    return {
      applies: false,
      stateName: state,
      taxableIncome: 0,
      estimatedStateTax: 0,
      estimatedMarginalRate: 0,
      estimatedStateBracketLabel: 'No state income tax',
    };
  }

  if (model.type === 'flat') {
    const deduction = getDeductionForStatus(model.deduction, filingStatus);
    const taxableIncome = Math.max(grossIncome - deduction, 0);
    const estimatedStateTax = taxableIncome * model.rate;

    return {
      applies: true,
      stateName: state,
      taxableIncome: Math.round(taxableIncome),
      estimatedStateTax: Math.round(estimatedStateTax),
      estimatedMarginalRate: model.rate,
      estimatedStateBracketLabel: `${Math.round(model.rate * 100 * 10) / 10}%`,
    };
  }

  const deduction = getDeductionForStatus(model.deduction, filingStatus);
  const taxableIncome = Math.max(grossIncome - deduction, taxableBase - deduction);
  const brackets = getBracketsForStatus(model.brackets, filingStatus);
  const estimatedStateTax = calculateTaxFromBrackets(taxableIncome, brackets);
  const estimatedMarginalRate = getMarginalRateFromBrackets(taxableIncome, brackets);

  return {
    applies: true,
    stateName: state,
    taxableIncome: Math.round(taxableIncome),
    estimatedStateTax: Math.round(estimatedStateTax),
    estimatedMarginalRate,
    estimatedStateBracketLabel: `${Math.round(estimatedMarginalRate * 1000) / 10}%`,
  };
}
