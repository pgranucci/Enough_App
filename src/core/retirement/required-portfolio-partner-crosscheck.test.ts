/**
 * Partner + variable income → required portfolio at retirement (PV).
 *
 *   npx vitest run src/core/retirement/required-portfolio-partner-crosscheck.test.ts
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { getHouseholdAnnualIncome } from '@/constants/profile';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { calculateRetirementPlan, retirementFundingYears } from '@/utils/retirement-planning';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { grossToNetRetirementIncome } from '@/utils/retirement-income-tax';
import { realReturnPercent } from '@/src/core/shared/projection';

import { fixtureComplexPartnerHousehold } from '@/src/core/retirement/fixtures-complex-partner';

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

describe('required portfolio — partner + variable cash flows', () => {
  const { profile, retirement: rawRetirement } = fixtureComplexPartnerHousehold();
  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement = applyIncomeReplacementToRetirement(rawRetirement, householdGross);
  const schedule = buildRetirementYearSchedule(retirement, profile);
  const plan = calculateRetirementPlan(retirement, profile);

  it('matches golden required portfolio and prints year-by-year sample', () => {
    expect(householdGross).toBe(205_000);
    expect(retirement.desiredAnnualGrossIncome).toBe(153_750);
    expect(retirementFundingYears(retirement, profile)).toBe(30);
    expect(schedule.rows.length).toBe(31);
    expect(plan.requiredPortfolioTarget).toBe(998_942);

    const lifestyleNet = grossToNetRetirementIncome(
      retirement.desiredAnnualGrossIncome,
      retirement
    );
    const realPct = realReturnPercent(
      retirement.expectedAnnualReturn,
      retirement.inflationAssumption
    );

    const lines: string[] = [];
    lines.push('');
    lines.push('=== Required portfolio — partner + variable income ===');
    lines.push('');
    lines.push('Household: Jordan (38) + Alex (41), partner mode, FL, married filing jointly');
    lines.push(`Household gross income: ${money(householdGross)}`);
    lines.push(`Income replacement 75% → lifestyle gross: ${money(153_750)} → net: ${money(lifestyleNet)}`);
    lines.push(`Self retires ${retirement.retirementAge}, partner ${retirement.partnerRetirementAge}`);
    lines.push(`Life expectancy ${retirement.lifeExpectancy} / ${retirement.partnerLifeExpectancy}`);
    lines.push(`Funding span: ages ${retirement.retirementAge}–${retirement.retirementAge + retirementFundingYears(retirement, profile)} (${schedule.rows.length} years)`);
    lines.push(`Real discount rate: ${realPct.toFixed(3)}% (7.5% nom, 2.5% inflation)`);
    lines.push('');
    lines.push('Income streams (gross):');
    lines.push(`  Self SS: ${money(28_000)}/yr from age ${retirement.socialSecurityClaimAge}`);
    lines.push(`  Partner SS: ${money(22_000)}/yr from partner age ${retirement.partnerSocialSecurityClaimAge}`);
    lines.push(`  Pension: ${money(12_000)}/yr from self retirement age`);
    lines.push('  Consulting (self): $1,500/mo ages 62–70');
    lines.push('  Rental (partner): $2,000/mo from partner age 64–85');
    lines.push('');
    lines.push('Year-by-year (self age | partner age | SS | partner SS | other | net need | gross w/d):');

    const highlightAges = new Set([62, 63, 64, 70, 71, 92]);
    for (const row of schedule.rows) {
      if (!highlightAges.has(row.age)) continue;
      lines.push(
        `  ${row.age} | ${row.partnerAge} | ${money(row.socialSecurityNet)} | ${money(row.partnerSocialSecurityNet)} | ${money(row.otherIncomeNet)} | ${money(row.netPortfolioNeed)} | ${money(row.grossPortfolioWithdrawal)}`
      );
    }

    lines.push('');
    lines.push(`REQUIRED PORTFOLIO (PV at age ${retirement.retirementAge}): ${money(plan.requiredPortfolioTarget)}`);
    lines.push(`First-year net gap (age ${retirement.retirementAge}): ${money(plan.retirementIncomeGap)}`);
    lines.push('');

    const report = lines.join('\n');
    console.log(report);
    writeFileSync('required-portfolio-partner-output.txt', report, 'utf8');
  });
});
