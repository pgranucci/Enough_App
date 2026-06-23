import { describe, expect, it } from 'vitest';

import { DEFAULT_EXPENSE_INPUTS, type ExpenseInputs } from '@/constants/profile';

import {
  computeEmergencyMonthlyFloor,
  computeMonthlyTotalExpenses,
  resolveEmergencySlushTargets,
} from '@/src/core/buckets/expense-targets';
import { isObligationActiveThroughMonth } from '@/src/core/shared/dates';

const AS_OF = new Date('2026-05-28T12:00:00Z');

function targets(expenses: ExpenseInputs) {
  const floor = computeEmergencyMonthlyFloor(expenses);
  const { emergency, slush } = resolveEmergencySlushTargets(expenses);
  const total = computeMonthlyTotalExpenses(expenses);
  return { floor, emergency, slush, total };
}

describe('emergency cross-check reference scenarios', () => {
  it('scenario 1 — solo renting', () => {
    const expenses: ExpenseInputs = {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent',
      monthlyEssentialsExHousing: 2_500,
      monthlyHousingCost: 2_000,
      emergencyCoverageMonths: 6,
      slushCoverageMonths: 3,
      monthlyDiscretionary: 800,
    };
    const r = targets(expenses);
    expect(r.floor).toBe(4_500);
    expect(r.emergency).toBe(27_000);
    expect(r.slush).toBe(15_900);
  });

  it('scenario 2 — partner, own, mortgage to 2030 + car to 2035', () => {
    const expenses: ExpenseInputs = {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'own',
      monthlyEssentialsExHousing: 3_000,
      monthlyHousingCost: 400,
      mortgage: {
        hasMortgage: true,
        mortgagePaidOff: false,
        monthlyPayment: 2_800,
        maturityDate: '2030-12-01',
      },
      nonMortgageDebts: [
        {
          id: 'car',
          name: 'Car loan',
          monthlyPayment: 450,
          maturityDate: '2035-06-01',
        },
      ],
      emergencyCoverageMonths: 6,
      slushCoverageMonths: 3,
      monthlyDiscretionary: 1_200,
    };
    const r = targets(expenses);
    expect(r.floor).toBe(6_250);
    expect(r.emergency).toBe(37_500);
    expect(r.slush).toBe(22_350);
  });

  it('scenario 3 — partner renting, three $500 debts, one paid off 01/2025', () => {
    expect(isObligationActiveThroughMonth('2025-01-01', AS_OF)).toBe(false);

    const expenses: ExpenseInputs = {
      ...DEFAULT_EXPENSE_INPUTS,
      housingSituation: 'rent',
      monthlyEssentialsExHousing: 2_800,
      monthlyHousingCost: 2_200,
      nonMortgageDebts: [
        {
          id: 'cc-a',
          name: 'Credit card A',
          monthlyPayment: 500,
          maturityDate: '2028-03-01',
        },
        {
          id: 'loan',
          name: 'Personal loan',
          monthlyPayment: 500,
          maturityDate: '2027-11-01',
        },
        {
          id: 'old',
          name: 'Card paid off',
          monthlyPayment: 500,
          maturityDate: '2025-01-01',
        },
      ],
      emergencyCoverageMonths: 6,
      slushCoverageMonths: 3,
      monthlyDiscretionary: 1_000,
    };
    const r = targets(expenses);
    expect(r.floor).toBe(6_000);
    expect(r.emergency).toBe(36_000);
    expect(r.slush).toBe(21_000);
  });
});
