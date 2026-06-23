import { DEFAULT_RETIREMENT_INPUTS } from '@/constants/retirement';
import { calculateRetirementPlan } from '@/utils/retirement-planning';

export type BucketId = 'emergency' | 'slush' | 'retirement';

export type BucketSummary = {
  id: BucketId;
  name: string;
  current: number;
  target: number;
  accent: string;
};

const retirementPlan = calculateRetirementPlan(DEFAULT_RETIREMENT_INPUTS);

export const ENOUGH_SCORE = 72;

export const BUCKET_SUMMARIES: BucketSummary[] = [
  {
    id: 'emergency',
    name: 'Emergency',
    current: 2800,
    target: 9000,
    accent: '#D97706',
  },
  {
    id: 'slush',
    name: 'Slush',
    current: 650,
    target: 1500,
    accent: '#7C6FD4',
  },
  {
    id: 'retirement',
    name: 'Retirement',
    current: retirementPlan.currentPortfolioGrossEquivalent,
    target: retirementPlan.requiredPortfolioTarget,
    accent: '#3B6FD4',
  },
];

export const NEXT_PRIORITY = {
  bucket: 'Emergency',
  message:
    'Add $400 this month to reach your 3-month cushion. Emergency is your weakest bucket right now.',
};
