/**
 * Roth / pre-tax mix cross-check — run:
 *   npx vitest run src/core/retirement/retirement-roth-crosscheck.test.ts
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { preTaxWithdrawalTaxRatePercent } from '@/utils/retirement-income-tax';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

function baseRetirement(traditionalBalance: number, rothBalance: number) {
  return makeRetirement({
    currentAge: 55,
    retirementAge: 55,
    lifeExpectancy: 90,
    desiredAnnualGrossIncome: 60_000,
    socialSecurityEstimate: 24_000,
    socialSecurityClaimAge: 62,
    pensionEstimate: 0,
    otherIncomeStreams: [
      {
        id: 'pt',
        name: 'Part-time',
        monthlyGross: 2_000,
        startAge: 65,
        endAge: 70,
        assignedTo: 'self',
        isWorkInRetirement: false,
      },
    ],
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'TX',
    retirementFilingStatus: 'single',
    traditionalBalance,
    rothBalance,
    monthlyContributions: 0,
  });
}

const profileAt55 = makeProfile({ dateOfBirth: '', userAge: 55 });

/** Locked PV at age 55 for demo income schedule (part-time + deferred SS). */
const REQUIRED_PV = {
  allPreTax: 701_288,
  allRoth: 630_053,
  halfMix: 656_547,
} as const;

describe('retirement Roth cross-check (readable output)', () => {
  it('prints balance mixes vs Roth-aware schedule PV', () => {
    const taxRate = preTaxWithdrawalTaxRatePercent(baseRetirement(0, 0), 60_000);
    const netAge55 = 54_839;

    const mixes = [
      { label: 'A — 100% pre-tax', trad: REQUIRED_PV.allPreTax, roth: 0, expectedPv: REQUIRED_PV.allPreTax },
      { label: 'B — 100% Roth', trad: 0, roth: REQUIRED_PV.allRoth, expectedPv: REQUIRED_PV.allRoth },
      { label: 'C — 50/50 nominal', trad: 328_274, roth: 328_274, expectedPv: REQUIRED_PV.halfMix },
      { label: 'D — 88% funded pre-tax', trad: 600_000, roth: 0, expectedPv: REQUIRED_PV.allPreTax },
      { label: 'E — 88% funded Roth', trad: 0, roth: 550_000, expectedPv: REQUIRED_PV.allRoth },
    ] as const;

    const lines: string[] = ['', '=== Roth mix cross-check (Roth-aware schedule) ===', ''];
    lines.push(`Required PV — 100% pre-tax: $${REQUIRED_PV.allPreTax.toLocaleString()}`);
    lines.push(`Required PV — 100% Roth: $${REQUIRED_PV.allRoth.toLocaleString()}`);
    lines.push(`Required PV — 50/50 mix: $${REQUIRED_PV.halfMix.toLocaleString()}`);
    lines.push(`Withdrawal tax rate on $60k gross: ${taxRate}%`);
    lines.push(`Age-55 net portfolio need: $${netAge55.toLocaleString()}`);
    lines.push('');
    lines.push(
      'Mix | Trad | Roth | Roth share | Gross w/d age 55 | Required PV | FV gross-equiv | Readiness %'
    );

    for (const m of mixes) {
      const retirement = baseRetirement(m.trad, m.roth);
      const plan = calculateRetirementPlan(retirement, profileAt55);
      const share = plan.rothBalanceShareToday;
      lines.push(
        `${m.label} | $${Math.round(m.trad).toLocaleString()} | $${Math.round(m.roth).toLocaleString()} | ${Math.round(share * 100)}% | $${plan.annualGrossWithdrawalFromPortfolio.toLocaleString()} | $${plan.requiredPortfolioTarget.toLocaleString()} | $${plan.futureGrossEquivalentPortfolio.toLocaleString()} | ${plan.projectedReadinessPercent}%`
      );
      expect(plan.requiredPortfolioTarget).toBe(m.expectedPv);
    }

    lines.push('');
    lines.push('Required PV now depends on Roth share (Roth-aware gross-up in year-by-year schedule).');
    lines.push('Readiness = min(100, projected gross-equiv balance / required PV).');
    lines.push('');

    writeFileSync('retirement-roth-crosscheck-output.txt', lines.join('\n'), 'utf8');
  });
});
