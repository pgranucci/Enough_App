export const HOUSING_SITUATION_OPTIONS = [
  { id: 'rent' as const, label: 'Rent' },
  { id: 'own' as const, label: 'Own' },
];

export const DEBT_NAME_OPTIONS = [
  'Credit card',
  'Car loan',
  'Student loan',
  'Personal loan',
  'Medical debt',
  'Other',
] as const;

export type DebtNameOption = (typeof DEBT_NAME_OPTIONS)[number];
