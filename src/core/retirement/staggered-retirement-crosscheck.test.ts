/**
 * Staggered partner retirement — full year-by-year trace for external cross-check.
 *
 *   npx vitest run src/core/retirement/staggered-retirement-crosscheck.test.ts
 *   cat staggered-retirement-crosscheck-output.txt
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';

import { getHouseholdAnnualIncome } from '@/constants/profile';
import { applyIncomeReplacementToRetirement } from '@/utils/retirement-income-target';
import { calculateRetirementPlan } from '@/utils/retirement-planning';
import {
  buildRetirementYearSchedule,
  presentValueOfScheduledGrossWithdrawals,
  retirementHorizonEndAge,
} from '@/src/core/retirement/year-by-year-income';
import { annualContinuingEmploymentGrossBreakdownAtAges } from '@/src/core/retirement/continuing-employment-income';
import { annualWorkInRetirementWagesAtAges } from '@/src/core/retirement/work-in-retirement-wages';
import {
  grossToNetRetirementIncome,
  householdNetIncomeAfterTax,
  preTaxWithdrawalTaxRatePercent,
  taxableHouseholdGrossIncome,
} from '@/utils/retirement-income-tax';
import { estimateRetirementTargetIncomeTax } from '@/utils/retirement-income-tax';
import {
  estimateEmployeePayrollTax,
  estimateHouseholdEmployeePayrollTax,
} from '@/utils/payroll-tax';
import { realReturnPercent } from '@/src/core/shared/projection';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';
import type { RetirementInputs } from '@/constants/retirement';

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function pct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

function phaseLabel(selfAge: number, partnerAge: number, partnerRetires: number): string {
  if (partnerAge < partnerRetires) return 'Partner working';
  if (selfAge < 67) return 'Both retired, pre-SS';
  if (partnerAge < 67) return 'Jordan SS only';
  return 'Both on SS';
}

type AlexWageBreakdown = {
  grossWages: number;
  federalIncomeTax: number;
  ficaSocialSecurity: number;
  ficaMedicare: number;
  totalPayrollTax: number;
  stateIncomeTax: number;
  netWageContribution: number;
};

type PartnerWorkingYearReconciliation = {
  jordanAge: number;
  alexAge: number;
  alexWages: AlexWageBreakdown;
  portfolioGross: number;
  portfolioPreTaxGross: number;
  portfolioRothGross: number;
  portfolioIncomeTax: number;
  portfolioNetContribution: number;
  ficaOnPortfolioIfApplied: number;
  householdIncomeTax: number;
  householdFicaApplied: number;
  householdNet: number;
  lifestyleNetTarget: number;
};

function alexSalaryTaxBreakdown(
  grossWages: number,
  taxLocation: Pick<RetirementInputs, 'retirementStateOfResidence' | 'retirementFilingStatus'>
): AlexWageBreakdown {
  const wageIncomeTax = estimateRetirementTargetIncomeTax(grossWages, taxLocation);
  const payroll = estimateEmployeePayrollTax(grossWages, taxLocation.retirementFilingStatus);
  const netWageContribution =
    grossWages - wageIncomeTax.estimatedTotalTax - payroll.totalPayrollTax;

  return {
    grossWages,
    federalIncomeTax: wageIncomeTax.estimatedFederalTax,
    ficaSocialSecurity: payroll.socialSecurityTax,
    ficaMedicare: payroll.medicareTax + payroll.additionalMedicareTax,
    totalPayrollTax: payroll.totalPayrollTax,
    stateIncomeTax: wageIncomeTax.estimatedStateTax,
    netWageContribution,
  };
}

function reconcilePartnerWorkingYear(
  jordanAge: number,
  alexAge: number,
  grossWages: number,
  portfolioGross: number,
  rothShare: number,
  taxLocation: Pick<RetirementInputs, 'retirementStateOfResidence' | 'retirementFilingStatus'>,
  lifestyleNetTarget: number
): PartnerWorkingYearReconciliation {
  const alexWages = alexSalaryTaxBreakdown(grossWages, taxLocation);
  const portfolioPreTaxGross = portfolioGross * (1 - rothShare);
  const portfolioRothGross = portfolioGross * rothShare;
  const householdTaxable = taxableHouseholdGrossIncome(grossWages, portfolioGross, rothShare);
  const householdIncomeTax = estimateRetirementTargetIncomeTax(
    householdTaxable,
    taxLocation
  ).estimatedTotalTax;
  const portfolioIncomeTax = Math.max(
    0,
    householdIncomeTax - alexWages.federalIncomeTax - alexWages.stateIncomeTax
  );
  const portfolioNetContribution = portfolioGross - portfolioIncomeTax;
  const householdFicaApplied = alexWages.totalPayrollTax;
  const ficaOnPortfolioIfApplied = estimateEmployeePayrollTax(
    portfolioGross,
    taxLocation.retirementFilingStatus
  ).totalPayrollTax;
  const householdNet = householdNetIncomeAfterTax(
    grossWages,
    portfolioGross,
    rothShare,
    taxLocation,
    householdFicaApplied
  );

  return {
    jordanAge,
    alexAge,
    alexWages,
    portfolioGross,
    portfolioPreTaxGross,
    portfolioRothGross,
    portfolioIncomeTax,
    portfolioNetContribution,
    ficaOnPortfolioIfApplied,
    householdIncomeTax,
    householdFicaApplied,
    householdNet,
    lifestyleNetTarget,
  };
}

describe('staggered retirement cross-check (full year-by-year)', () => {
  const profile = makeProfile({
    planningMode: 'partner',
    userName: 'Jordan',
    partnerName: 'Alex',
    dateOfBirth: '',
    partnerDateOfBirth: '',
    userAge: 58,
    partnerAge: 55,
    filingStatus: 'married_joint',
    annualIncome: 100_000,
    partnerBaseAnnualSalary: 80_000,
    partnerAnnualIncome: 80_000,
  });

  const rawRetirement = makeRetirement({
    currentAge: 58,
    retirementAge: 60,
    partnerRetirementAge: 63,
    lifeExpectancy: 90,
    partnerLifeExpectancy: 92,
    incomeReplacementPercent: 75,
    socialSecurityEstimate: 30_000,
    socialSecurityClaimAge: 67,
    socialSecurityMode: 'manual',
    partnerSocialSecurityEstimate: 22_000,
    partnerSocialSecurityClaimAge: 67,
    partnerSocialSecurityMode: 'manual',
    pensionEstimate: 0,
    otherIncomeStreams: [],
    traditionalBalance: 240_000,
    rothBalance: 120_000,
    monthlyContributions: 0,
    expectedAnnualReturn: 7.5,
    inflationAssumption: 2.5,
    retirementStateOfResidence: 'FL',
    retirementFilingStatus: 'married_joint',
  });

  const householdGross = getHouseholdAnnualIncome(profile);
  const retirement = applyIncomeReplacementToRetirement(rawRetirement, householdGross);
  const schedule = buildRetirementYearSchedule(retirement, profile);
  const plan = calculateRetirementPlan(retirement, profile);
  const rothShare = 120_000 / (240_000 + 120_000);
  const lifestyleNet = grossToNetRetirementIncome(
    retirement.desiredAnnualGrossIncome,
    retirement
  );
  const realRate = realReturnPercent(7.5, 2.5) / 100;
  const lifestyleTaxRate = preTaxWithdrawalTaxRatePercent(
    retirement,
    retirement.desiredAnnualGrossIncome
  );

  it('prints assumptions and every retirement year for external cross-check', () => {
    expect(householdGross).toBe(180_000);
    expect(retirement.desiredAnnualGrossIncome).toBe(135_000);
    expect(schedule.rows.length).toBeGreaterThan(20);
    expect(plan.requiredPortfolioTarget).toBe(Math.round(schedule.requiredPortfolioTarget));

    const lines: string[] = [];
    lines.push('');
    lines.push('=== Staggered partner retirement — year-by-year cross-check ===');
    lines.push('');
    lines.push('## Household assumptions');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push('| Planning mode | Partner (Jordan + Alex) |');
    lines.push('| Jordan age today | 58 |');
    lines.push('| Alex age today | 55 (3 years younger) |');
    lines.push('| Jordan retires | **60** |');
    lines.push('| Alex retires (stops full-time work) | **63** |');
    lines.push('| Life expectancy | Jordan 90 / Alex 92 |');
    lines.push('| State / filing | **Florida**, married filing jointly |');
    lines.push(`| Household gross income (pre-retirement) | ${money(householdGross)} |`);
    lines.push(`| Income replacement | 75% → lifestyle gross ${money(135_000)} |`);
    lines.push(`| Lifestyle net goal (after income tax if sole income) | ${money(lifestyleNet)} |`);
    lines.push(`| Reference tax rate on lifestyle gross | ${pct(lifestyleTaxRate)} |`);
    lines.push('| Nominal return / inflation | 7.5% / 2.5% → Fisher real ≈ 4.878% |');
    lines.push('');
    lines.push('## Portfolio at Jordan retirement (today\'s dollars)');
    lines.push(`| Pre-tax balance | ${money(240_000)} |`);
    lines.push(`| Roth balance | ${money(120_000)} |`);
    lines.push(`| Roth share (s) | ${pct(rothShare * 100)} |`);
    lines.push(`| Pre-tax share | ${pct((1 - rothShare) * 100)} |`);
    lines.push('');
    lines.push('## Income streams (gross, real dollars)');
    lines.push('| Stream | Amount | Timing |');
    lines.push('|--------|--------|--------|');
    lines.push(`| Alex full-time salary (auto) | ${money(80_000)}/yr | While Alex age < 63 (Jordan ages 60–65) |`);
    lines.push(`| Jordan Social Security | ${money(30_000)}/yr | From Jordan age **67** |`);
    lines.push(`| Alex Social Security | ${money(22_000)}/yr | From Alex age **67** (Jordan age **70**) |`);
    lines.push('| Pension / other streams | $0 | — |');
    lines.push('');
    lines.push('## Tax model notes');
    lines.push('- **Income tax:** federal + FL (no state income tax) on taxable gross each year.');
    lines.push('- **FICA:** employee OASDI (6.2% to wage base) + Medicare (1.45%) on **work wages** only.');
    lines.push('- Alex salary counts as work → FICA deducted from household net while Alex is still employed.');
    lines.push('- Portfolio withdrawal G split: pre-tax portion = G×(1−s) is taxable; Roth portion = G×s is tax-free cash.');
    lines.push('- Each year solves G so: known_gross + G − income_tax − FICA = lifestyle_net.');
    lines.push('');
    lines.push('## Alex $80,000 salary — tax breakdown (Jordan ages 60–65)');
    lines.push('');
    lines.push(
      'Federal income tax on wages uses the household MFJ return with Alex wages as the only gross income (standard deduction applied once). FICA applies to wages only — not portfolio withdrawals.'
    );
    lines.push('');

    const partnerWorkingRows = schedule.rows.filter(
      (row) => row.partnerAge < retirement.partnerRetirementAge
    );
    expect(partnerWorkingRows.map((row) => row.age)).toEqual([60, 61, 62, 63, 64, 65]);

    const firstPartnerWorking = partnerWorkingRows[0]!;
    const partnerWorkingReconciliation = reconcilePartnerWorkingYear(
      firstPartnerWorking.age,
      firstPartnerWorking.partnerAge,
      80_000,
      firstPartnerWorking.grossPortfolioWithdrawal,
      rothShare,
      retirement,
      lifestyleNet
    );
    const alex = partnerWorkingReconciliation.alexWages;

    lines.push('| Line item | Amount |');
    lines.push('|-----------|-------:|');
    lines.push(`| Gross wages | ${money(alex.grossWages)} |`);
    lines.push(`| Federal income tax | ${money(alex.federalIncomeTax)} |`);
    lines.push(`| FICA Social Security (6.2% on wages) | ${money(alex.ficaSocialSecurity)} |`);
    lines.push(`| FICA Medicare (1.45% on wages) | ${money(alex.ficaMedicare)} |`);
    lines.push(`| Total payroll taxes (FICA) | ${money(alex.totalPayrollTax)} |`);
    lines.push(`| State income tax (Florida) | ${money(alex.stateIncomeTax)} |`);
    lines.push(`| **Net wage contribution to household** | **${money(alex.netWageContribution)}** |`);
    lines.push('');
    lines.push(
      'Same figures every year while Alex is employed (Jordan ages 60–65 / Alex ages 57–62).'
    );
    lines.push('');
    lines.push('## Household reconciliation (Jordan ages 60–65)');
    lines.push('');
    lines.push('| Component | Gross | Income tax | FICA | Net to household |');
    lines.push('|-----------|------:|-----------:|-----:|-----------------:|');
    lines.push(
      '| ' +
        [
          'Alex wages',
          money(alex.grossWages),
          money(alex.federalIncomeTax + alex.stateIncomeTax),
          money(alex.totalPayrollTax),
          money(alex.netWageContribution),
        ].join(' | ') +
        ' |'
    );
    lines.push(
      '| ' +
        [
          'Portfolio withdrawal G',
          money(partnerWorkingReconciliation.portfolioGross),
          money(partnerWorkingReconciliation.portfolioIncomeTax),
          '$0',
          money(partnerWorkingReconciliation.portfolioNetContribution),
        ].join(' | ') +
        ' |'
    );
    lines.push(
      '| ' +
        [
          '**Household total**',
          money(alex.grossWages + partnerWorkingReconciliation.portfolioGross),
          money(partnerWorkingReconciliation.householdIncomeTax),
          money(partnerWorkingReconciliation.householdFicaApplied),
          `**${money(partnerWorkingReconciliation.householdNet)}**`,
        ].join(' | ') +
        ' |'
    );
    lines.push(`| Lifestyle net target | | | | ${money(lifestyleNet)} |`);
    lines.push('');
    lines.push('Portfolio split of G (same every partner-working year):');
    lines.push(
      `- Pre-tax portion (${pct((1 - rothShare) * 100)}): ${money(partnerWorkingReconciliation.portfolioPreTaxGross)} (taxable)`
    );
    lines.push(
      `- Roth portion (${pct(rothShare * 100)}): ${money(partnerWorkingReconciliation.portfolioRothGross)} (tax-free cash)`
    );
    lines.push('');
    lines.push('### Verification checks');
    lines.push('');
    lines.push(
      `- Alex net + portfolio net = ${money(alex.netWageContribution)} + ${money(partnerWorkingReconciliation.portfolioNetContribution)} = **${money(alex.netWageContribution + partnerWorkingReconciliation.portfolioNetContribution)}** (target ${money(lifestyleNet)})`
    );
    lines.push(
      `- Household net formula: gross cash ${money(alex.grossWages + partnerWorkingReconciliation.portfolioGross)} − income tax ${money(partnerWorkingReconciliation.householdIncomeTax)} − FICA ${money(partnerWorkingReconciliation.householdFicaApplied)} = **${money(partnerWorkingReconciliation.householdNet)}**`
    );
    lines.push(
      `- FICA base = Alex wages only (${money(alex.grossWages)}). FICA **not** applied to portfolio G (${money(partnerWorkingReconciliation.portfolioGross)}).`
    );
    lines.push(
      `- If FICA were incorrectly charged on portfolio G, extra payroll tax would be ${money(partnerWorkingReconciliation.ficaOnPortfolioIfApplied)} — model applies **$0**.`
    );
    lines.push('');

    for (const row of partnerWorkingRows) {
      const workWages = annualWorkInRetirementWagesAtAges(
        retirement.otherIncomeStreams,
        profile,
        retirement,
        row.age,
        row.partnerAge
      );
      const fica = estimateHouseholdEmployeePayrollTax(
        [workWages.self, workWages.partner].filter((w) => w > 0),
        retirement.retirementFilingStatus
      );
      const reconciliation = reconcilePartnerWorkingYear(
        row.age,
        row.partnerAge,
        workWages.partner,
        row.grossPortfolioWithdrawal,
        rothShare,
        retirement,
        lifestyleNet
      );
      const hhNet = householdNetIncomeAfterTax(
        workWages.partner,
        row.grossPortfolioWithdrawal,
        rothShare,
        retirement,
        fica
      );

      expect(workWages.partner).toBe(80_000);
      expect(fica).toBe(alex.totalPayrollTax);
      expect(reconciliation.householdFicaApplied).toBe(fica);
      expect(reconciliation.ficaOnPortfolioIfApplied).toBeGreaterThan(0);
      expect(Math.abs(hhNet - lifestyleNet)).toBeLessThanOrEqual(1);
      expect(Math.abs(reconciliation.householdNet - lifestyleNet)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          reconciliation.alexWages.netWageContribution +
            reconciliation.portfolioNetContribution -
            lifestyleNet
        )
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          reconciliation.householdNet -
            (reconciliation.alexWages.netWageContribution +
              reconciliation.portfolioNetContribution)
        )
      ).toBeLessThanOrEqual(1);
    }

    lines.push('## Year-by-year table');
    lines.push('');
    lines.push(
      [
        'Jordan',
        'Alex',
        'Phase',
        'Alex work',
        'Jordan SS',
        'Alex SS',
        'FICA',
        'Port G',
        'PreTax Wd',
        'Roth Wd',
        'Taxable',
        'IncTax',
        'HH Net',
        'Target',
      ].join(' | ')
    );
    lines.push(
      [
        'age',
        'age',
        '',
        'gross',
        'gross',
        'gross',
        '',
        '',
        '',
        '',
        'gross',
        '',
        'net',
        'net',
      ].join(' | ')
    );
    lines.push(
      '---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:'
    );

    for (const row of schedule.rows) {
      const partnerAge = row.partnerAge;
      const selfSsGross =
        row.age >= retirement.socialSecurityClaimAge
          ? retirement.socialSecurityEstimate
          : 0;
      const partnerSsGross =
        partnerAge >= retirement.partnerSocialSecurityClaimAge
          ? retirement.partnerSocialSecurityEstimate
          : 0;
      const continuing = annualContinuingEmploymentGrossBreakdownAtAges(
        profile,
        retirement,
        row.age,
        partnerAge
      );
      const workWages = annualWorkInRetirementWagesAtAges(
        retirement.otherIncomeStreams,
        profile,
        retirement,
        row.age,
        partnerAge
      );
      const fica = estimateHouseholdEmployeePayrollTax(
        [workWages.self, workWages.partner].filter((w) => w > 0),
        retirement.retirementFilingStatus
      );
      const portG = row.grossPortfolioWithdrawal;
      const preTaxWd = portG * (1 - rothShare);
      const rothWd = portG * rothShare;
      const knownGross =
        selfSsGross +
        partnerSsGross +
        continuing.self +
        continuing.partner;
      const taxable = taxableHouseholdGrossIncome(knownGross, portG, rothShare);
      const incomeTax = estimateRetirementTargetIncomeTax(taxable, retirement).estimatedTotalTax;
      const hhNet = householdNetIncomeAfterTax(
        knownGross,
        portG,
        rothShare,
        retirement,
        fica
      );

      lines.push(
        [
          row.age,
          partnerAge,
          phaseLabel(row.age, partnerAge, retirement.partnerRetirementAge),
          money(continuing.partner + continuing.self),
          money(selfSsGross),
          money(partnerSsGross),
          money(fica),
          money(portG),
          money(preTaxWd),
          money(rothWd),
          money(taxable),
          money(incomeTax),
          money(hhNet),
          money(lifestyleNet),
        ].join(' | ')
      );
    }

    lines.push('');
    lines.push('## Summary');
    lines.push(`| Required portfolio PV (Jordan age ${retirement.retirementAge}) | ${money(plan.requiredPortfolioTarget)} |`);
    lines.push(`| First-year portfolio gross withdrawal (age ${retirement.retirementAge}) | ${money(plan.annualGrossWithdrawalFromPortfolio)} |`);
    lines.push(`| First-year net portfolio gap | ${money(plan.retirementIncomeGap)} |`);
    lines.push(`| Funding years | ${schedule.rows.length} (ages ${retirement.retirementAge}–${retirementHorizonEndAge(retirement, profile)}) |`);
    lines.push(`| Real discount rate | ${pct(realRate * 100, 3)} |`);
    lines.push('');
    lines.push('## Sample years (detail)');
    lines.push('');

    for (const sampleAge of [60, 63, 65, 67, 70, 75, 90]) {
      const row = schedule.rows.find((r) => r.age === sampleAge);
      if (!row) continue;
      const partnerAge = row.partnerAge;
      const workWages = annualWorkInRetirementWagesAtAges(
        retirement.otherIncomeStreams,
        profile,
        retirement,
        row.age,
        partnerAge
      );
      const fica = estimateHouseholdEmployeePayrollTax(
        [workWages.self, workWages.partner].filter((w) => w > 0),
        retirement.retirementFilingStatus
      );
      const portG = row.grossPortfolioWithdrawal;
      lines.push(`### Jordan age ${sampleAge} (Alex age ${partnerAge}) — ${phaseLabel(row.age, partnerAge, retirement.partnerRetirementAge)}`);
      lines.push(`- Net portfolio need (gap before withdrawal): ${money(row.netPortfolioNeed)}`);
      lines.push(`- Portfolio gross withdrawal G: ${money(portG)}`);
      lines.push(`- Pre-tax portion of G (${pct((1 - rothShare) * 100)}): ${money(portG * (1 - rothShare))}`);
      lines.push(`- Roth portion of G (${pct(rothShare * 100)}): ${money(portG * rothShare)}`);
      lines.push(`- Partner work wages: ${money(workWages.partner)} | FICA this year: ${money(fica)}`);
      lines.push(`- Jordan SS gross: ${money(row.age >= 67 ? 30_000 : 0)} | Alex SS gross: ${money(partnerAge >= 67 ? 22_000 : 0)}`);
      lines.push(`- Household net after tax + FICA: ${money(hhNetFromRow(row, fica))} (target ${money(lifestyleNet)})`);
      lines.push('');
    }

    lines.push('## Prompt for another AI');
    lines.push('```');
    lines.push('Reproduce staggered-retirement-crosscheck-output.txt using the assumptions table.');
    lines.push('Verify at Jordan ages 60, 65, 67, 70: portfolio G, FICA on Alex wages, and household net = lifestyle net.');
    lines.push('At Jordan ages 60–65: Alex wages $80k → fed tax $5,523, FICA SS $4,960 + Medicare $1,160, net wages $68,357; portfolio net $53,715; FICA not on portfolio.');
    lines.push(`Required PV should be approximately ${money(plan.requiredPortfolioTarget)} at 4.878% real.`);
    lines.push('```');

    const report = lines.join('\n');
    writeFileSync('staggered-retirement-crosscheck-output.txt', report, 'utf8');
    console.log(report);

    const pv = presentValueOfScheduledGrossWithdrawals(
      schedule.rows.map((r) => r.grossPortfolioWithdrawal),
      realRate
    );
    expect(Math.abs(pv - schedule.requiredPortfolioTarget)).toBeLessThan(1);
  });
});

function hhNetFromRow(
  row: { age: number; partnerAge: number; grossPortfolioWithdrawal: number },
  fica: number
): number {
  const retirement = {
    retirementStateOfResidence: 'FL' as const,
    retirementFilingStatus: 'married_joint' as const,
  };
  const rothShare = 120_000 / 360_000;
  const selfSs = row.age >= 67 ? 30_000 : 0;
  const partnerSs = row.partnerAge >= 67 ? 22_000 : 0;
  const alexWork =
    row.partnerAge < 63 ? 80_000 : 0;
  const knownGross = selfSs + partnerSs + alexWork;
  return householdNetIncomeAfterTax(
    knownGross,
    row.grossPortfolioWithdrawal,
    rothShare,
    retirement,
    fica
  );
}
