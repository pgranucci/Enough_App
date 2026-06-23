/**
 * Real-dollar retirement readiness validation engine.
 * All amounts are today's (real) dollars — no inflation escalation.
 */
import { futureValueNominal } from '@/src/core/shared/projection';
import { presentValueOfScheduledGrossWithdrawals } from '@/src/core/retirement/year-by-year-income';
import { estimateAnnualIncomeTax } from '@/utils/income-tax-estimate';
import { estimateEmployeePayrollTax } from '@/utils/payroll-tax';
import {
  grossToNetRetirementIncome,
  preTaxWithdrawalTaxRatePercent,
  householdNetIncomeAfterTax,
  solvePortfolioGrossWithdrawalForHouseholdNetGoal,
  taxableHouseholdGrossIncome,
  grossAnnualWithdrawalForNetNeed,
} from '@/utils/retirement-income-tax';
import { rothToGrossEquivalent } from '@/utils/retirement-planning';
import type { FilingStatus } from '@/constants/profile';
import type { USStateCode } from '@/constants/us-states';

export const COLORADO_VALIDATION_SCENARIO = {
  household: {
    planningMode: 'partner' as const,
    filingStatus: 'married_joint' as FilingStatus,
    state: 'CO' as USStateCode,
    userAge: 40,
    partnerAge: 35,
    userRetirementAge: 60,
    partnerRetirementAge: 65,
    userLongevity: 95,
    partnerLongevity: 95,
  },
  assetsToday: {
    pretax: 400_000,
    roth: 200_000,
    taxable: 100_000,
  },
  annualContributions: {
    pretax: 24_000,
    roth: 12_000,
    taxable: 6_000,
  },
  accumulationRealReturnPercent: 5,
  retirement: {
    grossSpendingGoal: 120_000,
    realReturnPercent: 2.5,
  },
  incomeStreams: {
    partnerEmploymentGross: 70_000,
    partnerEmploymentYears: 5,
    userSocialSecurityGross: 36_000,
    userSocialSecurityStartAge: 67,
    partnerSocialSecurityGross: 24_000,
    partnerSocialSecurityStartAge: 67,
  },
} as const;

export type ValidationAssetMix = {
  pretax: number;
  roth: number;
  taxable: number;
  pretaxContrib: number;
  rothContrib: number;
  taxableContrib: number;
};

export type ValidationOptions = {
  assetMix?: Partial<ValidationAssetMix>;
  retirementRealReturnPercent?: number;
};

export type ValidationInputRow = {
  field: string;
  value: string | number;
};

export type AssetGrowthRow = {
  bucket: string;
  startBalance: number;
  annualContribution: number;
  yearsToRetirement: number;
  realReturnPercent: number;
  projectedBalance: number;
};

export type CashFlowRow = {
  userAge: number;
  partnerAge: number;
  spendingNeedGross: number;
  partnerIncome: number;
  userSocialSecurity: number;
  partnerSocialSecurity: number;
  portfolioWithdrawalGross: number;
  totalTaxes: number;
  endingPortfolioBalance: number;
};

export type TaxBreakdownRow = {
  userAge: number;
  totalGrossIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRatePercent: number;
};

export type ReadinessSummaryRow = {
  metric: string;
  value: number | string;
};

export type ValidationTrace = {
  inputs: ValidationInputRow[];
  assetGrowth: AssetGrowthRow[];
  cashFlowTimeline: CashFlowRow[];
  taxBreakdown: TaxBreakdownRow[];
  readinessSummary: ReadinessSummaryRow[];
  requiredPortfolioTarget: number;
  projectedPortfolioNominal: number;
  projectedPortfolioGrossEquivalent: number;
  readinessPercent: number;
};

const TAX_CTX = {
  retirementStateOfResidence: COLORADO_VALIDATION_SCENARIO.household.state,
  retirementFilingStatus: COLORADO_VALIDATION_SCENARIO.household.filingStatus,
};

function partnerAgeAtUserAge(userAge: number): number {
  const { userAge: u0, partnerAge: p0 } = COLORADO_VALIDATION_SCENARIO.household;
  return p0 + (userAge - u0);
}

function resolveAssetMix(override?: Partial<ValidationAssetMix>): ValidationAssetMix {
  const s = COLORADO_VALIDATION_SCENARIO;
  return {
    pretax: override?.pretax ?? s.assetsToday.pretax,
    roth: override?.roth ?? s.assetsToday.roth,
    taxable: override?.taxable ?? s.assetsToday.taxable,
    pretaxContrib: override?.pretaxContrib ?? s.annualContributions.pretax,
    rothContrib: override?.rothContrib ?? s.annualContributions.roth,
    taxableContrib: override?.taxableContrib ?? s.annualContributions.taxable,
  };
}

function partnerEmploymentGross(userAge: number, retirementStartAge: number, years: number): number {
  const endAge = retirementStartAge + years - 1;
  if (userAge < retirementStartAge || userAge > endAge) return 0;
  return COLORADO_VALIDATION_SCENARIO.incomeStreams.partnerEmploymentGross;
}

function projectBucket(
  startBalance: number,
  annualContribution: number,
  realReturnPercent: number,
  yearsToRetirement: number
): number {
  return Math.round(
    futureValueNominal(
      startBalance,
      annualContribution / 12,
      realReturnPercent / 100,
      Math.round(yearsToRetirement * 12)
    )
  );
}

function knownGrossIncomeAtUserAge(userAge: number): number {
  const streams = COLORADO_VALIDATION_SCENARIO.incomeStreams;
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const pAge = partnerAgeAtUserAge(userAge);
  const partnerIncome = partnerEmploymentGross(
    userAge,
    h.userRetirementAge,
    streams.partnerEmploymentYears
  );
  const userSs =
    userAge >= streams.userSocialSecurityStartAge ? streams.userSocialSecurityGross : 0;
  const partnerSs =
    pAge >= streams.partnerSocialSecurityStartAge ? streams.partnerSocialSecurityGross : 0;
  return partnerIncome + userSs + partnerSs;
}

function employeePayrollTaxAtUserAge(userAge: number): number {
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const streams = COLORADO_VALIDATION_SCENARIO.incomeStreams;
  const partnerWages = partnerEmploymentGross(
    userAge,
    h.userRetirementAge,
    streams.partnerEmploymentYears
  );
  if (partnerWages <= 0) return 0;
  return estimateEmployeePayrollTax(partnerWages, h.filingStatus).totalPayrollTax;
}

function buildYearlyWithdrawals(
  retirementReturnPercent: number,
  rothShare: number
): { ages: number[]; grossWithdrawals: number[]; rows: Omit<CashFlowRow, 'endingPortfolioBalance'>[] } {
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const r = COLORADO_VALIDATION_SCENARIO.retirement;

  const desiredNet = grossToNetRetirementIncome(r.grossSpendingGoal, TAX_CTX);

  const startAge = h.userRetirementAge;
  const endAge = h.userLongevity;
  const ages: number[] = [];
  const grossWithdrawals: number[] = [];
  const rows: Omit<CashFlowRow, 'endingPortfolioBalance'>[] = [];

  for (let age = startAge; age <= endAge; age += 1) {
    const pAge = partnerAgeAtUserAge(age);
    const knownGross = knownGrossIncomeAtUserAge(age);
    const partnerIncome = partnerEmploymentGross(
      age,
      startAge,
      COLORADO_VALIDATION_SCENARIO.incomeStreams.partnerEmploymentYears
    );
    const userSs =
      age >= COLORADO_VALIDATION_SCENARIO.incomeStreams.userSocialSecurityStartAge
        ? COLORADO_VALIDATION_SCENARIO.incomeStreams.userSocialSecurityGross
        : 0;
    const partnerSs =
      pAge >= COLORADO_VALIDATION_SCENARIO.incomeStreams.partnerSocialSecurityStartAge
        ? COLORADO_VALIDATION_SCENARIO.incomeStreams.partnerSocialSecurityGross
        : 0;

    const employeePayrollTax = employeePayrollTaxAtUserAge(age);

    const netWithoutPortfolio = householdNetIncomeAfterTax(
      knownGross,
      0,
      rothShare,
      TAX_CTX,
      employeePayrollTax
    );
    const portfolioWithdrawalGross = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      knownGross,
      rothShare,
      desiredNet,
      TAX_CTX,
      {},
      employeePayrollTax
    );

    const taxableGross = taxableHouseholdGrossIncome(
      knownGross,
      portfolioWithdrawalGross,
      rothShare
    );
    const taxEstimate = estimateAnnualIncomeTax(
      taxableGross,
      h.filingStatus,
      h.state
    );

    ages.push(age);
    grossWithdrawals.push(portfolioWithdrawalGross);
    rows.push({
      userAge: age,
      partnerAge: pAge,
      spendingNeedGross: r.grossSpendingGoal,
      partnerIncome,
      userSocialSecurity: userSs,
      partnerSocialSecurity: partnerSs,
      portfolioWithdrawalGross: Math.round(portfolioWithdrawalGross),
      totalTaxes: taxEstimate.estimatedTotalTax,
    });
  }

  return { ages, grossWithdrawals, rows };
}

function simulateDecumulation(
  startingPortfolio: number,
  grossWithdrawals: number[],
  retirementReturnPercent: number
): number[] {
  const r = retirementReturnPercent / 100;
  const endingBalances: number[] = [];
  let balance = startingPortfolio;

  for (const withdrawal of grossWithdrawals) {
    balance = balance * (1 + r) - withdrawal;
    endingBalances.push(Math.round(balance));
  }

  return endingBalances;
}

export function runReadinessValidation(
  options: ValidationOptions = {}
): ValidationTrace {
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const r = COLORADO_VALIDATION_SCENARIO.retirement;
  const streams = COLORADO_VALIDATION_SCENARIO.incomeStreams;
  const mix = resolveAssetMix(options.assetMix);
  const retirementReturn = options.retirementRealReturnPercent ?? r.realReturnPercent;
  const yearsToRetirement = h.userRetirementAge - h.userAge;

  const fvPretax = projectBucket(
    mix.pretax,
    mix.pretaxContrib,
    COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
    yearsToRetirement
  );
  const fvRoth = projectBucket(
    mix.roth,
    mix.rothContrib,
    COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
    yearsToRetirement
  );
  const fvTaxable = projectBucket(
    mix.taxable,
    mix.taxableContrib,
    COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
    yearsToRetirement
  );

  const projectedNominal = fvPretax + fvRoth + fvTaxable;
  const withdrawalTaxRate = preTaxWithdrawalTaxRatePercent(TAX_CTX, r.grossSpendingGoal);
  const rothShare =
    projectedNominal > 0 ? fvRoth / projectedNominal : 0;
  const rothGrossEquiv = rothToGrossEquivalent(fvRoth, withdrawalTaxRate);
  const projectedGrossEquivalent = fvPretax + fvTaxable + rothGrossEquiv;

  const { grossWithdrawals, rows: cashFlowBase } = buildYearlyWithdrawals(
    retirementReturn,
    rothShare
  );
  const requiredPortfolioTarget = Math.round(
    presentValueOfScheduledGrossWithdrawals(grossWithdrawals, retirementReturn / 100)
  );

  const endingBalances = simulateDecumulation(
    projectedNominal,
    grossWithdrawals,
    retirementReturn
  );
  const cashFlowTimeline: CashFlowRow[] = cashFlowBase.map((row, i) => ({
    ...row,
    endingPortfolioBalance: endingBalances[i] ?? 0,
  }));

  const readinessPercent =
    requiredPortfolioTarget > 0
      ? Math.min(100, Math.round((projectedGrossEquivalent / requiredPortfolioTarget) * 100))
      : 100;

  const inputs: ValidationInputRow[] = [
    { field: 'Planning mode', value: 'Partner (couple)' },
    { field: 'Filing status', value: 'Married filing jointly' },
    { field: 'State', value: 'Colorado' },
    { field: 'User age → retirement', value: `${h.userAge} → ${h.userRetirementAge}` },
    { field: 'Partner age → retirement', value: `${h.partnerAge} → ${h.partnerRetirementAge}` },
    { field: 'Longevity (both)', value: h.userLongevity },
    { field: 'Pretax balance today', value: mix.pretax },
    { field: 'Roth balance today', value: mix.roth },
    { field: 'Taxable balance today', value: mix.taxable },
    { field: 'Pretax contribution / yr', value: mix.pretaxContrib },
    { field: 'Roth contribution / yr', value: mix.rothContrib },
    { field: 'Taxable contribution / yr', value: mix.taxableContrib },
    { field: 'Accumulation real return', value: `${COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent}%` },
    { field: 'Retirement real return', value: `${retirementReturn}%` },
    { field: 'Spending goal (gross, real)', value: r.grossSpendingGoal },
    { field: 'Partner employment (gross)', value: `${streams.partnerEmploymentGross}/yr × ${streams.partnerEmploymentYears} yrs from user retirement` },
    { field: 'User SS (gross)', value: `${streams.userSocialSecurityGross}/yr from age ${streams.userSocialSecurityStartAge}` },
    { field: 'Partner SS (gross)', value: `${streams.partnerSocialSecurityGross}/yr from partner age ${streams.partnerSocialSecurityStartAge}` },
    { field: 'Dollar mode', value: 'Real (no inflation escalation)' },
  ];

  const assetGrowth: AssetGrowthRow[] = [
    {
      bucket: 'Pre-tax',
      startBalance: mix.pretax,
      annualContribution: mix.pretaxContrib,
      yearsToRetirement,
      realReturnPercent: COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
      projectedBalance: fvPretax,
    },
    {
      bucket: 'Roth',
      startBalance: mix.roth,
      annualContribution: mix.rothContrib,
      yearsToRetirement,
      realReturnPercent: COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
      projectedBalance: fvRoth,
    },
    {
      bucket: 'Taxable',
      startBalance: mix.taxable,
      annualContribution: mix.taxableContrib,
      yearsToRetirement,
      realReturnPercent: COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
      projectedBalance: fvTaxable,
    },
    {
      bucket: 'Total',
      startBalance: mix.pretax + mix.roth + mix.taxable,
      annualContribution: mix.pretaxContrib + mix.rothContrib + mix.taxableContrib,
      yearsToRetirement,
      realReturnPercent: COLORADO_VALIDATION_SCENARIO.accumulationRealReturnPercent,
      projectedBalance: projectedNominal,
    },
  ];

  const taxBreakdown: TaxBreakdownRow[] = [60, 64, 65, 67, 72, 95].map((age) => {
    const row = cashFlowTimeline.find((r) => r.userAge === age)!;
    const totalGross =
      row.partnerIncome +
      row.userSocialSecurity +
      row.partnerSocialSecurity +
      row.portfolioWithdrawalGross;
    const est = estimateAnnualIncomeTax(totalGross, h.filingStatus, h.state);
    return {
      userAge: age,
      totalGrossIncome: Math.round(totalGross),
      federalTax: est.estimatedFederalTax,
      stateTax: est.estimatedStateTax,
      totalTax: est.estimatedTotalTax,
      effectiveRatePercent: est.effectiveTaxRatePercent,
    };
  });

  const readinessSummary: ReadinessSummaryRow[] = [
    { metric: 'Years to retirement', value: yearsToRetirement },
    { metric: 'Projected portfolio (nominal buckets)', value: projectedNominal },
    { metric: 'Projected portfolio (gross-equivalent)', value: Math.round(projectedGrossEquivalent) },
    { metric: 'Required portfolio (PV of withdrawals)', value: requiredPortfolioTarget },
    { metric: 'Readiness %', value: `${readinessPercent}%` },
    { metric: 'Withdrawal tax rate on spending goal', value: `${withdrawalTaxRate}%` },
    { metric: 'Roth share at retirement', value: `${Math.round(rothShare * 100)}%` },
    { metric: 'Retirement funding years', value: h.userLongevity - h.userRetirementAge + 1 },
    { metric: 'Portfolio balance at longevity', value: cashFlowTimeline.at(-1)?.endingPortfolioBalance ?? 0 },
  ];

  return {
    inputs,
    assetGrowth,
    cashFlowTimeline,
    taxBreakdown,
    readinessSummary,
    requiredPortfolioTarget,
    projectedPortfolioNominal: projectedNominal,
    projectedPortfolioGrossEquivalent: Math.round(projectedGrossEquivalent),
    readinessPercent,
  };
}

/** Tolerance helper for currency (±$1 default). */
export function withinTolerance(actual: number, expected: number, tolerance = 1): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

/** Tolerance helper for rates (±0.05 pp default). */
export function withinRateTolerance(
  actual: number,
  expected: number,
  tolerancePoints = 0.05
): boolean {
  return Math.abs(actual - expected) <= tolerancePoints;
}

export type ValidationCheck = {
  name: string;
  pass: boolean;
  detail?: string;
};

export function runValidationChecks(baseTrace: ValidationTrace): ValidationCheck[] {
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const streams = COLORADO_VALIDATION_SCENARIO.incomeStreams;
  const spending = COLORADO_VALIDATION_SCENARIO.retirement.grossSpendingGoal;
  const checks: ValidationCheck[] = [];

  const allSpendingFlat = baseTrace.cashFlowTimeline.every(
    (row) => row.spendingNeedGross === spending
  );
  checks.push({
    name: 'Spending remains exactly $120,000 real gross every year',
    pass: allSpendingFlat,
    detail: allSpendingFlat ? undefined : 'Found a year with a different spending value',
  });

  const employmentYears = baseTrace.cashFlowTimeline.filter((row) => row.partnerIncome > 0);
  checks.push({
    name: 'Partner employment is $70,000 for exactly 5 years starting at user retirement',
    pass:
      employmentYears.length === streams.partnerEmploymentYears &&
      employmentYears.every((row) => row.partnerIncome === streams.partnerEmploymentGross) &&
      employmentYears[0]?.userAge === h.userRetirementAge,
    detail: `Active ${employmentYears.length} years; first age ${employmentYears[0]?.userAge}`,
  });

  checks.push({
    name: 'Partner employment ends after 5 years',
    pass: baseTrace.cashFlowTimeline.every(
      (row) =>
        row.userAge < h.userRetirementAge + streams.partnerEmploymentYears ||
        row.partnerIncome === 0
    ),
  });

  const userSsStart = baseTrace.cashFlowTimeline.find((row) => row.userSocialSecurity > 0);
  checks.push({
    name: 'User Social Security starts at age 67',
    pass:
      userSsStart?.userAge === streams.userSocialSecurityStartAge &&
      baseTrace.cashFlowTimeline
        .filter((row) => row.userAge < streams.userSocialSecurityStartAge)
        .every((row) => row.userSocialSecurity === 0),
    detail: `First SS at user age ${userSsStart?.userAge}`,
  });

  const partnerSsStart = baseTrace.cashFlowTimeline.find((row) => row.partnerSocialSecurity > 0);
  const expectedUserAgeForPartnerSs =
    streams.partnerSocialSecurityStartAge + (h.userAge - h.partnerAge);
  checks.push({
    name: 'Partner Social Security starts at partner age 67',
    pass:
      partnerSsStart?.partnerAge === streams.partnerSocialSecurityStartAge &&
      partnerSsStart?.userAge === expectedUserAgeForPartnerSs,
    detail: `First partner SS at user age ${partnerSsStart?.userAge}, partner age ${partnerSsStart?.partnerAge}`,
  });

  const coTaxAtRetirement = baseTrace.taxBreakdown.find((row) => row.userAge === 60);
  checks.push({
    name: 'Colorado state taxes are nonzero',
    pass: (coTaxAtRetirement?.stateTax ?? 0) > 0,
    detail: `State tax at age 60: $${coTaxAtRetirement?.stateTax ?? 0}`,
  });

  const totalStart = 700_000;
  const allPretax = runReadinessValidation({
    assetMix: {
      pretax: totalStart,
      roth: 0,
      taxable: 0,
      pretaxContrib: 42_000,
      rothContrib: 0,
      taxableContrib: 0,
    },
  });
  const allRoth = runReadinessValidation({
    assetMix: {
      pretax: 0,
      roth: totalStart,
      taxable: 0,
      pretaxContrib: 0,
      rothContrib: 42_000,
      taxableContrib: 0,
    },
  });
  checks.push({
    name: 'All-Roth scenario produces higher readiness than all-pre-tax (same nominal balance)',
    pass:
      allRoth.projectedPortfolioGrossEquivalent > allPretax.projectedPortfolioGrossEquivalent &&
      allRoth.requiredPortfolioTarget < allPretax.requiredPortfolioTarget,
    detail: `Gross-equiv Roth $${allRoth.projectedPortfolioGrossEquivalent.toLocaleString()} vs pre-tax $${allPretax.projectedPortfolioGrossEquivalent.toLocaleString()}; required PV Roth $${allRoth.requiredPortfolioTarget.toLocaleString()} vs pre-tax $${allPretax.requiredPortfolioTarget.toLocaleString()}`,
  });

  const lowReturn = runReadinessValidation({ retirementRealReturnPercent: 2.5 });
  const highReturn = runReadinessValidation({ retirementRealReturnPercent: 4 });
  checks.push({
    name: 'Increasing retirement return lowers required portfolio',
    pass: highReturn.requiredPortfolioTarget < lowReturn.requiredPortfolioTarget,
    detail: `Required @ 2.5%: $${lowReturn.requiredPortfolioTarget.toLocaleString()}; @ 4%: $${highReturn.requiredPortfolioTarget.toLocaleString()}`,
  });

  checks.push({
    name: 'Required portfolio is positive',
    pass: baseTrace.requiredPortfolioTarget > 0,
    detail: `$${baseTrace.requiredPortfolioTarget.toLocaleString()}`,
  });

  checks.push({
    name: 'Projected gross-equivalent exceeds nominal (Roth gross-up)',
    pass: baseTrace.projectedPortfolioGrossEquivalent >= baseTrace.projectedPortfolioNominal,
  });

  return checks;
}

export function printValidationTrace(trace: ValidationTrace): void {
  console.log('\n=== 1. INPUT SUMMARY ===');
  console.table(trace.inputs);

  console.log('\n=== 2. PROJECTED ASSET GROWTH (real 5%, 20 years) ===');
  console.table(trace.assetGrowth);

  console.log('\n=== 3. RETIREMENT CASH FLOW TIMELINE ===');
  console.table(trace.cashFlowTimeline);

  console.log('\n=== 4. TAX BREAKDOWN (selected ages) ===');
  console.table(trace.taxBreakdown);

  console.log('\n=== 5. READINESS SUMMARY ===');
  console.table(trace.readinessSummary);
}

export function printPassFailSummary(checks: ValidationCheck[]): void {
  console.log('\n=== PASS / FAIL SUMMARY ===');
  console.table(
    checks.map((c) => ({
      check: c.name,
      result: c.pass ? 'PASS' : 'FAIL',
      detail: c.detail ?? '',
    }))
  );
}

export function detectSuspiciousCalculations(trace: ValidationTrace): string[] {
  const warnings: string[] = [];
  const last = trace.cashFlowTimeline.at(-1);

  if (last && last.endingPortfolioBalance > trace.projectedPortfolioNominal * 0.5) {
    warnings.push(
      `Portfolio still ${Math.round(last.endingPortfolioBalance).toLocaleString()} at age ${last.userAge} — may be over-funded or withdrawal schedule too low.`
    );
  }
  if (last && last.endingPortfolioBalance < -10_000) {
    warnings.push(
      `Portfolio goes negative (${last.endingPortfolioBalance.toLocaleString()}) before longevity — under-funded for this decumulation path.`
    );
  }

  const peakWithdrawal = Math.max(...trace.cashFlowTimeline.map((r) => r.portfolioWithdrawalGross));
  const ssYears = trace.cashFlowTimeline.filter((r) => r.userSocialSecurity > 0);
  if (ssYears.length > 0) {
    const afterSs = ssYears[ssYears.length - 1]!.portfolioWithdrawalGross;
    if (afterSs > peakWithdrawal * 0.95) {
      warnings.push(
        'Portfolio withdrawals stay nearly as high after Social Security starts — verify SS offsets are applied correctly.'
      );
    }
  }

  if (trace.readinessPercent >= 100 && last && last.endingPortfolioBalance > 500_000) {
    warnings.push(
      'Readiness shows 100% but large ending balance remains — gross-equivalent cap may mask surplus.'
    );
  }

  const age60 = trace.cashFlowTimeline.find((r) => r.userAge === 60);
  if (age60 && age60.portfolioWithdrawalGross > age60.spendingNeedGross) {
    warnings.push(
      'Age-60 gross portfolio withdrawal exceeds gross spending — expected when taxes are grossed up on withdrawals.'
    );
  }

  return warnings;
}

export type RothWithdrawalComparisonRow = {
  userAge: number;
  phase: string;
  netPortfolioNeed: number;
  /** What the app / validation timeline uses today (100% pre-tax gross-up). */
  scheduleGrossWithdrawal: number;
  /** Lower gross if withdrawals were Roth-aware at this mix. */
  rothAwareGrossWithdrawal: number;
  annualSavings: number;
  rothShareApplied: number;
};

export type RothMixReadinessRow = {
  label: string;
  rothSharePercent: number;
  projectedNominal: number;
  projectedGrossEquivalent: number;
  requiredPortfolioPv: number;
  readinessPercent: number;
};

export type RothWithdrawalImpactSummary = {
  taxRateOnSpendingPercent: number;
  mixRows: RothMixReadinessRow[];
  milestoneComparisons: RothWithdrawalComparisonRow[];
  /** PV if schedule used Roth-aware gross-up instead of pre-tax-only. */
  rothAwareRequiredPv: Record<'actualMix' | 'allPretax' | 'allRoth', number>;
};

function phaseLabel(userAge: number): string {
  if (userAge <= 64) return 'Partner working';
  if (userAge <= 66) return 'Bridge';
  if (userAge <= 71) return 'User SS';
  return 'Both SS';
}

function netPortfolioNeedAtAge(userAge: number, rothShare = 0): number {
  const r = COLORADO_VALIDATION_SCENARIO.retirement;
  const desiredNet = grossToNetRetirementIncome(r.grossSpendingGoal, TAX_CTX);
  const knownGross = knownGrossIncomeAtUserAge(userAge);
  const employeePayrollTax = employeePayrollTaxAtUserAge(userAge);
  const netWithoutPortfolio = householdNetIncomeAfterTax(
    knownGross,
    0,
    rothShare,
    TAX_CTX,
    employeePayrollTax
  );
  return Math.max(0, desiredNet - netWithoutPortfolio);
}

function requiredPvForRothShare(
  rothShare: number,
  retirementReturnPercent: number
): number {
  const h = COLORADO_VALIDATION_SCENARIO.household;
  const desiredNet = grossToNetRetirementIncome(
    COLORADO_VALIDATION_SCENARIO.retirement.grossSpendingGoal,
    TAX_CTX
  );
  const grossWithdrawals: number[] = [];

  for (let age = h.userRetirementAge; age <= h.userLongevity; age += 1) {
    const knownGross = knownGrossIncomeAtUserAge(age);
    const gross = solvePortfolioGrossWithdrawalForHouseholdNetGoal(
      knownGross,
      rothShare,
      desiredNet,
      TAX_CTX,
      {},
      employeePayrollTaxAtUserAge(age)
    );
    grossWithdrawals.push(gross);
  }

  return Math.round(
    presentValueOfScheduledGrossWithdrawals(
      grossWithdrawals,
      retirementReturnPercent / 100
    )
  );
}

/** Compare schedule (pre-tax gross-up) vs Roth-aware withdrawals and readiness by mix. */
export function buildRothWithdrawalImpactSummary(
  milestoneAges: number[] = [60, 65, 67, 72]
): RothWithdrawalImpactSummary {
  const taxRate = preTaxWithdrawalTaxRatePercent(
    TAX_CTX,
    COLORADO_VALIDATION_SCENARIO.retirement.grossSpendingGoal
  );
  const baseTrace = runReadinessValidation();
  const rothShare = baseTrace.assetGrowth.find((r) => r.bucket === 'Roth')!
    .projectedBalance / baseTrace.projectedPortfolioNominal;

  const allPretax = runReadinessValidation({
    assetMix: {
      pretax: 700_000,
      roth: 0,
      taxable: 0,
      pretaxContrib: 42_000,
      rothContrib: 0,
      taxableContrib: 0,
    },
  });
  const allRoth = runReadinessValidation({
    assetMix: {
      pretax: 0,
      roth: 700_000,
      taxable: 0,
      pretaxContrib: 0,
      rothContrib: 42_000,
      taxableContrib: 0,
    },
  });

  const mixRows: RothMixReadinessRow[] = [
    {
      label: 'Actual mix (29% Roth)',
      rothSharePercent: Math.round(rothShare * 100),
      projectedNominal: baseTrace.projectedPortfolioNominal,
      projectedGrossEquivalent: baseTrace.projectedPortfolioGrossEquivalent,
      requiredPortfolioPv: baseTrace.requiredPortfolioTarget,
      readinessPercent: baseTrace.readinessPercent,
    },
    {
      label: 'All pre-tax',
      rothSharePercent: 0,
      projectedNominal: allPretax.projectedPortfolioNominal,
      projectedGrossEquivalent: allPretax.projectedPortfolioGrossEquivalent,
      requiredPortfolioPv: allPretax.requiredPortfolioTarget,
      readinessPercent: allPretax.readinessPercent,
    },
    {
      label: 'All Roth',
      rothSharePercent: 100,
      projectedNominal: allRoth.projectedPortfolioNominal,
      projectedGrossEquivalent: allRoth.projectedPortfolioGrossEquivalent,
      requiredPortfolioPv: allRoth.requiredPortfolioTarget,
      readinessPercent: allRoth.readinessPercent,
    },
  ];

  const milestoneComparisons: RothWithdrawalComparisonRow[] = milestoneAges.map((age) => {
    const knownGross = knownGrossIncomeAtUserAge(age);
    const netNeed = Math.round(netPortfolioNeedAtAge(age, rothShare));
    const employeePayrollTax = employeePayrollTaxAtUserAge(age);
    const gross = Math.round(
      solvePortfolioGrossWithdrawalForHouseholdNetGoal(
        knownGross,
        rothShare,
        grossToNetRetirementIncome(
          COLORADO_VALIDATION_SCENARIO.retirement.grossSpendingGoal,
          TAX_CTX
        ),
        TAX_CTX,
        {},
        employeePayrollTax
      )
    );
    const pretaxOnlyGross = Math.round(
      grossAnnualWithdrawalForNetNeed(netNeed, rothShare, taxRate)
    );
    return {
      userAge: age,
      phase: phaseLabel(age),
      netPortfolioNeed: netNeed,
      scheduleGrossWithdrawal: gross,
      rothAwareGrossWithdrawal: gross,
      annualSavings: pretaxOnlyGross - gross,
      rothShareApplied: Math.round(rothShare * 1000) / 10,
    };
  });

  const retReturn = COLORADO_VALIDATION_SCENARIO.retirement.realReturnPercent;

  return {
    taxRateOnSpendingPercent: taxRate,
    mixRows,
    milestoneComparisons,
    rothAwareRequiredPv: {
      actualMix: requiredPvForRothShare(rothShare, retReturn),
      allPretax: requiredPvForRothShare(0, retReturn),
      allRoth: requiredPvForRothShare(1, retReturn),
    },
  };
}
