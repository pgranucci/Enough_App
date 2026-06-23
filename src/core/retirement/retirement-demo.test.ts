/**
 * Readable sanity check — run with:
 *   npx vitest run src/core/retirement/retirement-demo.test.ts
 */
import { describe, expect, it } from 'vitest';

import { calculateRetirementPlan } from '@/utils/retirement-planning';

import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

describe('retirement demo (readable output)', () => {
  it('prints year-by-year schedule for retire 55, SS at 62, part-time 65–70', async () => {
    const profile = makeProfile({ dateOfBirth: '', userAge: 50 });
    const retirement = makeRetirement({
      currentAge: 50,
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
    });

    const schedule = buildRetirementYearSchedule(retirement, profile);
    const plan = calculateRetirementPlan(retirement, profile);

    const lines: string[] = [];
    lines.push('');
    lines.push('=== Retirement calculation demo ===');
    lines.push('');
    lines.push('Inputs:');
    lines.push(`  Retire at age:     ${retirement.retirementAge}`);
    lines.push(`  Lifestyle (gross): ${money(60_000)}/yr`);
    lines.push(`  Social Security:   ${money(24_000)}/yr starting at claim age ${retirement.socialSecurityClaimAge}`);
    lines.push(`  Part-time:         ${money(2_000)}/mo from age 65–70`);
    lines.push(`  Assumed return:    ${retirement.expectedAnnualReturn}% nominal, ${retirement.inflationAssumption}% inflation`);
    lines.push('');
    lines.push('Year-by-year (selected ages):');
    lines.push(
      '  Age | SS net | Other net | Portfolio net need | Gross withdrawal'
    );
    lines.push(
      '  ----+--------+-----------+--------------------+------------------'
    );

    for (const row of schedule.rows) {
      if (row.age > 72 && row.age !== schedule.rows[schedule.rows.length - 1]!.age) {
        continue;
      }
      if (row.age > 72 && row.age === schedule.rows[schedule.rows.length - 1]!.age) {
        lines.push('  ...');
      }
      lines.push(
        `  ${String(row.age).padStart(3)} | ${money(row.socialSecurityNet).padStart(6)} | ${money(row.otherIncomeNet).padStart(9)} | ${money(row.netPortfolioNeed).padStart(18)} | ${money(row.grossPortfolioWithdrawal)}`
      );
    }

    lines.push('');
    lines.push('Summary (what the app uses):');
    lines.push(`  First-year net gap (age ${retirement.retirementAge}):     ${money(plan.retirementIncomeGap)}`);
    lines.push(`  First-year gross withdrawal:              ${money(plan.annualGrossWithdrawalFromPortfolio)}`);
    lines.push(`  Required portfolio (PV of all years):     ${money(plan.requiredPortfolioTarget)}`);
    lines.push(`  Funding horizon:                          ${plan.retirementFundingYears} years`);
    lines.push('');
    lines.push('Sanity checks:');
    lines.push(`  SS $0 before 62:        ${schedule.rows.find((r) => r.age === 55)!.socialSecurityNet === 0 ? 'yes' : 'NO'}`);
    lines.push(`  SS on at 62+:          ${schedule.rows.find((r) => r.age === 62)!.socialSecurityNet > 0 ? 'yes' : 'NO'}`);
    lines.push(`  Part-time only 65–70:  ${schedule.rows.find((r) => r.age === 64)!.otherIncomeNet === 0 && schedule.rows.find((r) => r.age === 65)!.otherIncomeNet > 0 ? 'yes' : 'NO'}`);
    lines.push(`  Need drops after SS:   ${schedule.rows.find((r) => r.age === 55)!.netPortfolioNeed > schedule.rows.find((r) => r.age === 62)!.netPortfolioNeed ? 'yes' : 'NO'}`);
    lines.push('');

    const report = lines.join('\n');
    console.log(report);
    // Vitest may hide stdout in some runners — file is always visible after the run.
    const { writeFileSync } = await import('node:fs');
    writeFileSync('retirement-demo-output.txt', report, 'utf8');

    expect(schedule.rows.find((r) => r.age === 55)!.socialSecurityNet).toBe(0);
    expect(schedule.rows.find((r) => r.age === 62)!.socialSecurityNet).toBeGreaterThan(0);
    expect(plan.requiredPortfolioTarget).toBeGreaterThan(0);
  });
});
