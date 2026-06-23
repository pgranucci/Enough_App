import type { BucketQuestion } from '@/constants/custom-bucket-templates';

export const PROJECTION_ASSUMPTION_QUESTIONS: BucketQuestion[] = [
  {
    id: 'growthRate',
    label: 'Expected investment growth rate',
    placeholder: '7',
    defaultValue: '7',
    suffix: '%',
  },
  {
    id: 'inflationRate',
    label: 'Inflation assumption',
    placeholder: '3',
    defaultValue: '3',
    suffix: '%',
  },
];
