/**
 * Solo life expectancy → readiness score sweep for external cross-check.
 *
 *   npx vitest run src/core/retirement/solo-life-expectancy-readiness.test.ts
 *   cat solo-life-expectancy-readiness-output.txt
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { DEFAULT_LIFE_EXPECTANCY } from '@/constants/retirement';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { buildRetirementYearSchedule } from '@/src/core/retirement/year-by-year-income';
import { realReturnPercent } from '@/src/core/shared/projection';
import { fixtureSoloTexasAccumulation } from '@/src/core/retirement/fixtures';

const LIFE_EXPECTANCY_SWEEP = [75, 80, 85, 90, 95, 100, 105] as const;

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function pct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

describe('solo life expectancy readiness simulation', () => {
  const { profile, retirement: baseRetirement } = fixtureSoloTexasAccumulation();
  const profileSolo = { ...profile, planningMode: 'solo' as const, userAge: 40 };

  const rows = LIFE_EXPECTANCY_SWEEP.map((lifeExpectancy) => {
    const retirement = { ...baseRetirement, lifeExpectancy };
    const plan = calculateRetirementPlan(retirement, profileSolo);
    const schedule = buildRetirementYearSchedule(retirement, profileSolo);
    return {
      lifeExpectancy,
      fundingYears: plan.retirementFundingYears,
      scheduleYears: schedule.rows.length,
      requiredPortfolioTarget: plan.requiredPortfolioTarget,
      projectedGrossEquivalent: plan.futureGrossEquivalentPortfolio,
      readinessPercent: plan.projectedReadinessPercent,
      firstYearGrossWithdrawal: plan.annualGrossWithdrawalFromPortfolio,
    };
  });

  const defaultRow = rows.find((r) => r.lifeExpectancy === DEFAULT_LIFE_EXPECTANCY)!;

  it('prints life expectancy sweep and writes cross-check output', () => {
    expect(profileSolo.planningMode).toBe('solo');
    expect(defaultRow.lifeExpectancy).toBe(95);
    expect(defaultRow.fundingYears).toBe(30);

    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1]!;
      const curr = rows[i]!;
      expect(curr.fundingYears).toBeGreaterThan(prev.fundingYears);
      expect(curr.requiredPortfolioTarget).toBeGreaterThan(prev.requiredPortfolioTarget);
      expect(curr.readinessPercent).toBeLessThanOrEqual(prev.readinessPercent);
    }

    const realRate = realReturnPercent(
      baseRetirement.expectedAnnualReturn,
      baseRetirement.inflationAssumption
    );

    const lines: string[] = [];
    lines.push('');
    lines.push('=== Solo life expectancy → readiness simulation ===');
    lines.push('');
    lines.push('## Fixed inputs (all rows identical except life expectancy)');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push('| Planning mode | **Solo** (partner LE ignored) |');
    lines.push('| Current age | 40 |');
    lines.push('| Retirement age | 65 |');
    lines.push('| State / filing | Texas, single |');
    lines.push('| Lifestyle gross target | $80,000/yr (real dollars) |');
    lines.push('| Social Security | Excluded ($0) |');
    lines.push('| Pre-tax balance today | $100,000 |');
    lines.push('| Roth balance today | $50,000 |');
    lines.push('| Monthly contributions | $1,000 (pro-rata to 67% pre-tax / 33% Roth) |');
    lines.push('| Expected return / inflation | 7.5% / 2.5% → Fisher real ≈ 4.878% |');
    lines.push(`| Default life expectancy | **${DEFAULT_LIFE_EXPECTANCY}** |`);
    lines.push('');
    lines.push('## Readiness formula');
    lines.push('');
    lines.push('```');
    lines.push('readiness% = min(100, round(projectedGrossEquivalentAtRetirement / requiredPortfolioPV × 100))');
    lines.push('requiredPortfolioPV = PV of year-by-year gross portfolio withdrawals from age 65 to lifeExpectancy');
    lines.push('fundingYears = lifeExpectancy − retirementAge  (solo mode only)');
    lines.push('```');
    lines.push('');
    lines.push('## Results by life expectancy');
    lines.push('');
    lines.push(
      [
        'Life exp',
        'Funding yrs',
        'Schedule yrs',
        'Required PV',
        'Projected gross-equiv',
        'Readiness',
        'Δ readiness vs default',
        'Δ required PV vs default',
      ].join(' | ')
    );
    lines.push(
      [
        '(age)',
        '',
        '(65→LE)',
        "at age 65",
        'at age 65',
        '%',
        'pp',
        '$',
      ].join(' | ')
    );
    lines.push(
      '---:|---:|---:|---:|---:|---:|---:|---:'
    );

    for (const row of rows) {
      const readinessDelta = row.readinessPercent - defaultRow.readinessPercent;
      const pvDelta = row.requiredPortfolioTarget - defaultRow.requiredPortfolioTarget;
      const isDefault = row.lifeExpectancy === DEFAULT_LIFE_EXPECTANCY;
      lines.push(
        [
          row.lifeExpectancy + (isDefault ? ' **(default)**' : ''),
          row.fundingYears,
          row.scheduleYears,
          money(row.requiredPortfolioTarget),
          money(row.projectedGrossEquivalent),
          `${row.readinessPercent}%`,
          readinessDelta === 0 ? '—' : `${readinessDelta > 0 ? '+' : ''}${readinessDelta} pp`,
          pvDelta === 0 ? '—' : `${pvDelta > 0 ? '+' : ''}${money(pvDelta)}`,
        ].join(' | ')
      );
    }

    lines.push('');
    lines.push('## Key observations');
    lines.push('');
    lines.push(
      `- **Default (95):** ${defaultRow.readinessPercent}% readiness; need ${money(defaultRow.requiredPortfolioTarget)}; fund ${defaultRow.fundingYears} years (ages 65–95).`
    );
    const lowest = rows[0]!;
    const highest = rows[rows.length - 1]!;
    lines.push(
      `- **Shortest (${lowest.lifeExpectancy}):** ${lowest.readinessPercent}% readiness (+${lowest.readinessPercent - defaultRow.readinessPercent} pp vs default); required PV ${money(lowest.requiredPortfolioTarget)} (${money(lowest.requiredPortfolioTarget - defaultRow.requiredPortfolioTarget)} vs default).`
    );
    lines.push(
      `- **Longest (${highest.lifeExpectancy}):** ${highest.readinessPercent}% readiness (${highest.readinessPercent - defaultRow.readinessPercent} pp vs default); required PV ${money(highest.requiredPortfolioTarget)} (+${money(highest.requiredPortfolioTarget - defaultRow.requiredPortfolioTarget)} vs default).`
    );
    lines.push(
      `- Projected gross-equivalent at 65 is **constant** (${money(defaultRow.projectedGrossEquivalent)}) — life expectancy only changes required PV, not accumulation.`
    );
    lines.push(
      `- First-year gross portfolio withdrawal is **constant** (${money(defaultRow.firstYearGrossWithdrawal)}) in this scenario (no SS); longer life adds more discounted out-years.`
    );
    lines.push('');
    lines.push('## Sample year-by-year check (default LE 95, first & last year)');
    lines.push('');
    const defaultSchedule = buildRetirementYearSchedule(
      { ...baseRetirement, lifeExpectancy: DEFAULT_LIFE_EXPECTANCY },
      profileSolo
    );
    const first = defaultSchedule.rows[0]!;
    const last = defaultSchedule.rows[defaultSchedule.rows.length - 1]!;
    lines.push(`| Year | Age | Gross portfolio withdrawal |`);
    lines.push(`|------|----:|---------------------------:|`);
    lines.push(`| First | ${first.age} | ${money(first.grossPortfolioWithdrawal)} |`);
    lines.push(`| Last | ${last.age} | ${money(last.grossPortfolioWithdrawal)} |`);
    lines.push(`| PV sum (${defaultSchedule.rows.length} years @ ${pct(realRate, 3)} real) | | **${money(defaultSchedule.requiredPortfolioTarget)}** |`);
    lines.push('');
    lines.push('## Prompts for another AI');
    lines.push('');
    lines.push('```');
    lines.push('Reproduce solo-life-expectancy-readiness-output.txt.');
    lines.push('');
    lines.push('Fixed: solo, age 40→65, TX single, $80k lifestyle gross, $100k pre-tax + $50k Roth,');
    lines.push('$1k/mo contributions, 7.5% return, 2.5% inflation, no Social Security.');
    lines.push('');
    lines.push(`Verify fundingYears = lifeExpectancy − 65 for LE 75, 85, 95, 105:`);
    for (const le of [75, 85, 95, 105]) {
      const row = rows.find((r) => r.lifeExpectancy === le)!;
      lines.push(`  LE ${le} → ${row.fundingYears} years, required PV ≈ ${money(row.requiredPortfolioTarget)}, readiness ≈ ${row.readinessPercent}%`);
    }
    lines.push('');
    lines.push(`Default LE 95 readiness should be ${defaultRow.readinessPercent}% with required PV ≈ ${money(defaultRow.requiredPortfolioTarget)}.`);
    lines.push('Readiness must decrease (or stay at 100% cap) as life expectancy increases.');
    lines.push('Projected gross-equivalent at 65 must be identical across all life expectancy rows.');
    lines.push('```');

    const report = lines.join('\n');
    writeFileSync('solo-life-expectancy-readiness-output.txt', report, 'utf8');
    console.log(report);

    expect(rows.every((r) => r.projectedGrossEquivalent === defaultRow.projectedGrossEquivalent)).toBe(
      true
    );
  });
});
