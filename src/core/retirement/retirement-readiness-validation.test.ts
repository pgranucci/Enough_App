/**
 * Deterministic retirement readiness validation — Colorado couple scenario.
 *
 *   npx vitest run src/core/retirement/retirement-readiness-validation.test.ts
 *   npx vitest run src/core/retirement/retirement-readiness-validation.test.ts --reporter=verbose
 */
import { describe, expect, it } from 'vitest';

import {
  COLORADO_VALIDATION_SCENARIO,
  detectSuspiciousCalculations,
  printPassFailSummary,
  printValidationTrace,
  runReadinessValidation,
  runValidationChecks,
  withinTolerance,
  buildRothWithdrawalImpactSummary,
} from '@/src/core/retirement/readiness-validation-engine';

describe('retirement readiness validation — Colorado couple (real dollars)', () => {
  const trace = runReadinessValidation();
  const checks = runValidationChecks(trace);

  it('prints complete calculation trace with console tables', () => {
    printValidationTrace(trace);
    printPassFailSummary(checks);

    const warnings = detectSuspiciousCalculations(trace);
    if (warnings.length > 0) {
      console.log('\n=== SUSPICIOUS CALCULATIONS / EDGE CASES ===');
      for (const w of warnings) {
        console.log(`  ⚠ ${w}`);
      }
    }
  });

  it('projects asset growth with 5% real return over 20 years', () => {
    const pretax = trace.assetGrowth.find((r) => r.bucket === 'Pre-tax')!;
    const roth = trace.assetGrowth.find((r) => r.bucket === 'Roth')!;
    const taxable = trace.assetGrowth.find((r) => r.bucket === 'Taxable')!;
    const total = trace.assetGrowth.find((r) => r.bucket === 'Total')!;

    expect(pretax.projectedBalance).toBe(1_894_581);
    expect(roth.projectedBalance).toBe(947_291);
    expect(taxable.projectedBalance).toBe(473_645);
    expect(total.projectedBalance).toBe(3_315_517);
    expect(total.projectedBalance).toBe(
      pretax.projectedBalance + roth.projectedBalance + taxable.projectedBalance
    );
  });

  it('computes required portfolio PV at 2.5% real retirement return', () => {
    expect(trace.requiredPortfolioTarget).toBe(1_545_860);
    expect(withinTolerance(trace.projectedPortfolioGrossEquivalent, 3_457_066, 500)).toBe(true);
    expect(trace.readinessPercent).toBe(100);
  });

  it('keeps spending at exactly $120,000 gross every retirement year', () => {
    for (const row of trace.cashFlowTimeline) {
      expect(row.spendingNeedGross).toBe(
        COLORADO_VALIDATION_SCENARIO.retirement.grossSpendingGoal
      );
    }
    expect(trace.cashFlowTimeline).toHaveLength(36);
  });

  it('applies partner employment for 5 years then stops', () => {
    const { userRetirementAge } = COLORADO_VALIDATION_SCENARIO.household;
    const { partnerEmploymentYears, partnerEmploymentGross } =
      COLORADO_VALIDATION_SCENARIO.incomeStreams;

    for (let age = userRetirementAge; age < userRetirementAge + partnerEmploymentYears; age += 1) {
      const row = trace.cashFlowTimeline.find((r) => r.userAge === age)!;
      expect(row.partnerIncome).toBe(partnerEmploymentGross);
    }

    const after = trace.cashFlowTimeline.find(
      (r) => r.userAge === userRetirementAge + partnerEmploymentYears
    )!;
    expect(after.partnerIncome).toBe(0);
  });

  it('starts Social Security at correct ages', () => {
    const row66 = trace.cashFlowTimeline.find((r) => r.userAge === 66)!;
    const row67 = trace.cashFlowTimeline.find((r) => r.userAge === 67)!;
    const row71 = trace.cashFlowTimeline.find((r) => r.userAge === 71)!;
    const row72 = trace.cashFlowTimeline.find((r) => r.userAge === 72)!;

    expect(row66.userSocialSecurity).toBe(0);
    expect(row67.userSocialSecurity).toBe(36_000);
    expect(row71.partnerSocialSecurity).toBe(0);
    expect(row72.partnerSocialSecurity).toBe(24_000);
    expect(row72.partnerAge).toBe(67);
  });

  it('applies nonzero Colorado taxes', () => {
    const age60 = trace.taxBreakdown.find((r) => r.userAge === 60)!;
    expect(age60.stateTax).toBeGreaterThan(0);
    expect(age60.federalTax).toBeGreaterThan(0);
    expect(age60.effectiveRatePercent).toBeGreaterThan(0);
  });

  it('shows higher readiness for all-Roth vs all-pre-tax at same balance', () => {
    const total = 700_000;
    const pretaxOnly = runReadinessValidation({
      assetMix: {
        pretax: total,
        roth: 0,
        taxable: 0,
        pretaxContrib: 42_000,
        rothContrib: 0,
        taxableContrib: 0,
      },
    });
    const rothOnly = runReadinessValidation({
      assetMix: {
        pretax: 0,
        roth: total,
        taxable: 0,
        pretaxContrib: 0,
        rothContrib: 42_000,
        taxableContrib: 0,
      },
    });

    expect(rothOnly.projectedPortfolioGrossEquivalent).toBeGreaterThan(
      pretaxOnly.projectedPortfolioGrossEquivalent
    );
    expect(pretaxOnly.projectedPortfolioGrossEquivalent).toBe(3_315_517);
    expect(rothOnly.projectedPortfolioGrossEquivalent).toBe(3_810_939);
  });

  it('lowers required portfolio when retirement return increases', () => {
    const at25 = runReadinessValidation({ retirementRealReturnPercent: 2.5 });
    const at40 = runReadinessValidation({ retirementRealReturnPercent: 4 });

    expect(at40.requiredPortfolioTarget).toBeLessThan(at25.requiredPortfolioTarget);
    expect(at25.requiredPortfolioTarget).toBe(1_545_860);
    expect(at40.requiredPortfolioTarget).toBe(1_273_054);
  });

  it('runs decumulation with ending portfolio balances', () => {
    const age60 = trace.cashFlowTimeline.find((r) => r.userAge === 60)!;
    const age95 = trace.cashFlowTimeline.find((r) => r.userAge === 95)!;

    expect(age60.portfolioWithdrawalGross).toBeGreaterThan(0);
    expect(age60.endingPortfolioBalance).toBeGreaterThan(age60.portfolioWithdrawalGross);
    expect(typeof age95.endingPortfolioBalance).toBe('number');
  });

  it('passes all validation checks', () => {
    const failures = checks.filter((c) => !c.pass);
    if (failures.length > 0) {
      console.table(failures);
    }
    expect(failures).toHaveLength(0);
  });

  it('documents Roth impact on readiness vs withdrawals', () => {
    const impact = buildRothWithdrawalImpactSummary();
    expect(impact.mixRows[2]!.projectedGrossEquivalent).toBeGreaterThan(
      impact.mixRows[0]!.projectedGrossEquivalent
    );
    expect(impact.mixRows[2]!.requiredPortfolioPv).toBeLessThan(
      impact.mixRows[1]!.requiredPortfolioPv
    );
    expect(impact.milestoneComparisons[0]!.scheduleGrossWithdrawal).toBe(
      impact.milestoneComparisons[0]!.rothAwareGrossWithdrawal
    );
    expect(impact.rothAwareRequiredPv.allRoth).toBeLessThan(impact.rothAwareRequiredPv.allPretax);
  });
});
