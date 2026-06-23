import { describe, expect, it } from 'vitest';

import type { RetirementOtherIncomeStream } from '@/constants/retirement';

import {
  annualHouseholdOtherIncomeAtRetirement,
  annualOtherIncomeAtAge,
} from '@/utils/retirement-other-income';

function stream(
  overrides: Partial<RetirementOtherIncomeStream> = {}
): RetirementOtherIncomeStream {
  return {
    id: 'income-1',
    name: 'Consulting',
    monthlyGross: 2_000,
    startAge: 65,
    endAge: 75,
    assignedTo: 'self',
    isWorkInRetirement: false,
    ...overrides,
  };
}

describe('retirement other income streams', () => {
  it('sums active streams at a given age', () => {
    expect(annualOtherIncomeAtAge([stream()], 64)).toBe(0);
    expect(annualOtherIncomeAtAge([stream()], 65)).toBe(24_000);
    expect(annualOtherIncomeAtAge([stream()], 75)).toBe(24_000);
    expect(annualOtherIncomeAtAge([stream()], 76)).toBe(0);
  });

  it('evaluates partner streams at partner retirement age', () => {
    const partnerStream = stream({ assignedTo: 'partner', monthlyGross: 1_000 });
    expect(annualHouseholdOtherIncomeAtRetirement([partnerStream], 65, 64)).toBe(0);
    expect(annualHouseholdOtherIncomeAtRetirement([partnerStream], 65, 67)).toBe(12_000);
  });
});
