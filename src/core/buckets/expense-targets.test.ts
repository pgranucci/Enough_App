import { describe, expect, it } from 'vitest';

import { DEFAULT_EXPENSE_INPUTS, type ExpenseInputs } from '@/constants/profile';

import {
  computeEmergencyMonthlyFloor,
  computeNecessaryEmergencyTarget,
  isMortgageActiveForBuckets,
  monthlyHousingObligationForEmergency,
  resolveEmergencySlushTargets,
} from '@/src/core/buckets/expense-targets';

function expenses(overrides: Partial<ExpenseInputs>): ExpenseInputs {
  return { ...DEFAULT_EXPENSE_INPUTS, ...overrides };
}

describe('monthlyHousingObligationForEmergency', () => {
  it('matches onboarding scenario targets for a 3-month renter setup', () => {
    const input = expenses({
      housingSituation: 'rent',
      monthlyHousingCost: 1650,
      monthlyEssentialsExHousing: 1000,
      monthlyDiscretionary: 1600,
      nonMortgageDebts: [],
      emergencyCoverageMonths: 3,
      slushCoverageMonths: 3,
    });

    expect(computeEmergencyMonthlyFloor(input)).toBe(2650);
    expect(computeNecessaryEmergencyTarget(input)).toBe(7950);
    expect(resolveEmergencySlushTargets(input)).toEqual({
      emergency: 7950,
      slush: 12750,
    });
  });

  it('does not double-count rent and mortgage when owning with an active mortgage', () => {
    const input = expenses({
      housingSituation: 'own',
      monthlyEssentialsExHousing: 1000,
      monthlyHousingCost: 1000,
      mortgage: {
        hasMortgage: true,
        mortgagePaidOff: false,
        monthlyPayment: 2000,
        maturityDate: '2035-01-01',
      },
    });

    expect(monthlyHousingObligationForEmergency(input)).toBe(2000);
    expect(computeEmergencyMonthlyFloor(input)).toBe(3000);
    expect(computeNecessaryEmergencyTarget(input)).toBe(18_000);
  });

  it('drops mortgage payment after payoff month', () => {
    const afterPayoff = new Date('2026-05-01T12:00:00Z');
    const mortgage = {
      hasMortgage: true,
      mortgagePaidOff: false,
      monthlyPayment: 2000,
      maturityDate: '2026-04-01',
    };

    expect(isMortgageActiveForBuckets(mortgage, afterPayoff)).toBe(false);
    expect(
      monthlyHousingObligationForEmergency(
        expenses({
          housingSituation: 'own',
          monthlyHousingCost: 500,
          mortgage,
        })
      )
    ).toBe(500);
  });
});
