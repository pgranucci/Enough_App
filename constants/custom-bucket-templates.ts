import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { buildCustomGoalBucket, type BucketItem } from '@/constants/buckets';
import { parseNumber } from '@/utils/numbers';
import { formatWholeNumberInput } from '@/utils/format';
import { formatMonthYearDisplay } from '@/utils/month-year-input';
import {
  defaultGoalTargetMonthDisplay,
  parseGoalTargetMonthAnswer,
} from '@/utils/goal-target-date';

export type CustomBucketTemplateId = 'college' | 'house' | 'travel' | 'business' | 'custom';

export type BucketQuestionInputType = 'text' | 'number' | 'monthYear';

export type BucketQuestion = {
  id: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  suffix?: string;
  inputType?: BucketQuestionInputType;
};

export type CustomBucketTemplate = {
  id: CustomBucketTemplateId;
  name: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent: string;
  questions: BucketQuestion[];
  buildBucket: (answers: Record<string, string>, id: string) => BucketItem;
};

export const GOAL_TARGET_MONTH_QUESTION_ID = 'goalTargetMonth';

function goalTargetFromAnswers(answers: Record<string, string>) {
  return parseGoalTargetMonthAnswer(answers[GOAL_TARGET_MONTH_QUESTION_ID] ?? '');
}

function goalTargetQuestion(
  label: string,
  monthsAheadDefault: number
): BucketQuestion {
  return {
    id: GOAL_TARGET_MONTH_QUESTION_ID,
    label,
    placeholder: 'MM/YYYY',
    defaultValue: defaultGoalTargetMonthDisplay(monthsAheadDefault),
    inputType: 'monthYear',
  };
}

function buildGoalBucket(
  answers: Record<string, string>,
  id: string,
  base: Pick<BucketItem, 'name' | 'accent' | 'target'>,
  goalTargetMonth: string | null
) {
  return buildCustomGoalBucket({
    id,
    ...base,
    goalTargetMonth: goalTargetMonth ?? undefined,
  });
}

export function buildBucketFromTemplate(
  template: CustomBucketTemplate,
  answers: Record<string, string>,
  id: string
): BucketItem {
  const bucket = template.buildBucket(answers, id);
  return {
    ...bucket,
    sourceTemplateId: template.id,
    wizardAnswers: answers,
  };
}

export function mergeEditedCustomBucket(
  existing: BucketItem,
  built: BucketItem,
  templateId: CustomBucketTemplateId,
  answers: Record<string, string>
): BucketItem {
  return {
    ...existing,
    name: built.name,
    accent: built.accent,
    target: built.target,
    goalTargetMonth: built.goalTargetMonth,
    goalHorizonYears: built.goalHorizonYears,
    yearsUntilTarget: built.goalHorizonYears ?? existing.yearsUntilTarget,
    sourceTemplateId: templateId,
    wizardAnswers: answers,
  };
}

export function getEditTemplateForBucket(bucket: BucketItem): CustomBucketTemplate {
  const template = bucket.sourceTemplateId
    ? getTemplateById(bucket.sourceTemplateId as CustomBucketTemplateId)
    : undefined;
  return template ?? getTemplateById('custom')!;
}

function formatAnswerForDisplay(question: BucketQuestion, value: string) {
  if (!value.trim()) return '';
  if (question.suffix === '$') {
    return formatWholeNumberInput(value.replace(/\D/g, '') || value);
  }
  if (question.inputType === 'monthYear') {
    return formatMonthYearDisplay(value);
  }
  return value;
}

export function getEditAnswersForBucket(
  bucket: BucketItem,
  template: CustomBucketTemplate
): Record<string, string> {
  if (bucket.wizardAnswers && bucket.sourceTemplateId === template.id) {
    return Object.fromEntries(
      template.questions.map((question) => [
        question.id,
        formatAnswerForDisplay(question, bucket.wizardAnswers?.[question.id] ?? ''),
      ])
    );
  }

  if (template.id === 'custom') {
    return {
      name: bucket.name,
      targetAmount:
        bucket.target > 0 ? formatWholeNumberInput(String(Math.round(bucket.target))) : '',
      [GOAL_TARGET_MONTH_QUESTION_ID]: bucket.goalTargetMonth
        ? formatMonthYearDisplay(bucket.goalTargetMonth)
        : '',
    };
  }

  return getDefaultAnswers(template);
}

export const CUSTOM_BUCKET_TEMPLATES: CustomBucketTemplate[] = [
  {
    id: 'college',
    name: 'College',
    description: 'Tuition and expenses before enrollment',
    icon: 'school-outline',
    accent: '#8B5CF6',
    questions: [
      {
        id: 'annualCost',
        label: 'Estimated annual cost',
        placeholder: '35000',
        defaultValue: '35000',
        suffix: '$',
      },
      {
        id: 'yearsOfCollege',
        label: 'Years of college',
        placeholder: '4',
        defaultValue: '4',
        suffix: 'years',
      },
      goalTargetQuestion('First tuition payment (month & year)', 8 * 12),
    ],
    buildBucket: (answers, id) => {
      const annualCost = parseNumber(answers.annualCost);
      const yearsOfCollege = parseNumber(answers.yearsOfCollege, 4);
      const target = annualCost * yearsOfCollege;
      return buildGoalBucket(
        answers,
        id,
        { name: 'College Fund', accent: '#8B5CF6', target },
        goalTargetFromAnswers(answers)
      );
    },
  },
  {
    id: 'house',
    name: 'House',
    description: 'Down payment and closing costs',
    icon: 'home-outline',
    accent: '#F59E0B',
    questions: [
      {
        id: 'homePrice',
        label: 'Expected home price',
        placeholder: '450000',
        defaultValue: '450000',
        suffix: '$',
      },
      {
        id: 'downPaymentPercent',
        label: 'Down payment %',
        placeholder: '20',
        defaultValue: '20',
        suffix: '%',
      },
      {
        id: 'closingCostsPercent',
        label: 'Closing costs %',
        placeholder: '3',
        defaultValue: '3',
        suffix: '%',
      },
      goalTargetQuestion('Target purchase date (month & year)', 5 * 12),
    ],
    buildBucket: (answers, id) => {
      const homePrice = parseNumber(answers.homePrice);
      const downPct = parseNumber(answers.downPaymentPercent, 20);
      const closingPct = parseNumber(answers.closingCostsPercent, 3);
      const target = homePrice * (downPct / 100) + homePrice * (closingPct / 100);
      return buildGoalBucket(
        answers,
        id,
        { name: 'House Fund', accent: '#F59E0B', target },
        goalTargetFromAnswers(answers)
      );
    },
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Fund a specific trip or adventure',
    icon: 'airplane-outline',
    accent: '#06B6D4',
    questions: [
      {
        id: 'tripCost',
        label: "Total trip cost (today's dollars)",
        placeholder: '5000',
        defaultValue: '5000',
        suffix: '$',
      },
      goalTargetQuestion('Trip date (month & year)', 12),
    ],
    buildBucket: (answers, id) => {
      const target = parseNumber(answers.tripCost);
      return buildGoalBucket(
        answers,
        id,
        { name: 'Travel Fund', accent: '#06B6D4', target },
        goalTargetFromAnswers(answers)
      );
    },
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Startup costs plus operating runway',
    icon: 'briefcase-outline',
    accent: '#6366F1',
    questions: [
      {
        id: 'startupCosts',
        label: 'Startup / setup costs',
        placeholder: '15000',
        defaultValue: '15000',
        suffix: '$',
      },
      {
        id: 'monthlyExpenses',
        label: 'Monthly operating expenses',
        placeholder: '4000',
        defaultValue: '4000',
        suffix: '$',
      },
      {
        id: 'runwayMonths',
        label: 'Runway months to cover',
        placeholder: '6',
        defaultValue: '6',
        suffix: 'months',
      },
      goalTargetQuestion('Launch date (month & year)', 18),
    ],
    buildBucket: (answers, id) => {
      const startup = parseNumber(answers.startupCosts);
      const monthlyExpenses = parseNumber(answers.monthlyExpenses);
      const runway = parseNumber(answers.runwayMonths, 6);
      const target = startup + monthlyExpenses * runway;
      return buildGoalBucket(
        answers,
        id,
        { name: 'Business Fund', accent: '#6366F1', target },
        goalTargetFromAnswers(answers)
      );
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own goal amount',
    icon: 'create-outline',
    accent: '#6B7280',
    questions: [
      { id: 'name', label: 'Bucket name', placeholder: 'My Goal', inputType: 'text' },
      {
        id: 'targetAmount',
        label: "Target amount (today's dollars)",
        placeholder: '10000',
        suffix: '$',
      },
      goalTargetQuestion('When you need this money (month & year)', 3 * 12),
    ],
    buildBucket: (answers, id) => {
      const name = answers.name.trim() || 'Custom Goal';
      const target = parseNumber(answers.targetAmount);
      return buildGoalBucket(answers, id, { name, accent: '#6B7280', target }, goalTargetFromAnswers(answers));
    },
  },
];

export function getTemplateById(id: CustomBucketTemplateId) {
  return CUSTOM_BUCKET_TEMPLATES.find((template) => template.id === id);
}

const DEFAULT_GOAL_FUND_NAME_TO_TEMPLATE_ID = Object.fromEntries(
  CUSTOM_BUCKET_TEMPLATES.filter((template) => template.id !== 'custom').map((template) => [
    template.buildBucket(getDefaultAnswers(template), 'preview').name,
    template.id,
  ])
) as Record<string, CustomBucketTemplateId>;

/** Resolve the New-bucket template used to create a custom goal (for matching icons). */
export function resolveBucketTemplateId(
  sourceTemplateId?: string,
  bucketName?: string
): CustomBucketTemplateId | undefined {
  if (sourceTemplateId) {
    const template = getTemplateById(sourceTemplateId as CustomBucketTemplateId);
    if (template) return template.id;
  }
  if (bucketName) {
    const fromName = DEFAULT_GOAL_FUND_NAME_TO_TEMPLATE_ID[bucketName];
    if (fromName) return fromName;
  }
  return undefined;
}

export function getDefaultAnswers(template: CustomBucketTemplate) {
  return Object.fromEntries(
    template.questions.map((question) => {
      const raw = question.defaultValue ?? '';
      if (question.suffix === '$' && raw) {
        return [question.id, formatWholeNumberInput(raw)];
      }
      return [question.id, raw];
    })
  );
}

export function isBucketQuestionAnswered(question: BucketQuestion, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (question.inputType === 'monthYear') {
    return parseGoalTargetMonthAnswer(trimmed) != null;
  }
  if (question.id === 'name') {
    return Boolean(trimmed);
  }
  return true;
}
