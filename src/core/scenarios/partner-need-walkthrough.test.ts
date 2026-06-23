/**
 * Diagnostic: year-by-year retirement need for partner cross-check scenario.
 * Run: npx vitest run src/core/scenarios/partner-need-walkthrough.test.ts --reporter=verbose
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPartnerScenario } from './partner-crosscheck-fixture';
import {
  calculateRetirementPlan,
  presentValueOfRetirementWithdrawals,
  retirementFundingYears,
} from '@/utils/retirement-planning';
import {
  buildRetirementYearSchedule,
  presentValueOfScheduledGrossWithdrawals,
  retirementHorizonEndAge,
} from '@/src/core/retirement/year-by-year-income';
import { grossToNetRetirementIncome } from '@/utils/retirement-income-tax';
import { realReturnPercent } from '@/src/core/shared/projection';
import { isBucketGroup, type BucketEntry, type BucketItem } from '@/constants/buckets';

const AS_OF = new Date('2026-06-05T12:00:00Z');

function bucketById(entries: BucketEntry[], bucketId: string): BucketItem {
  const bucket = entries.find((entry) => !isBucketGroup(entry) && entry.id === bucketId);
  expect(bucket, `${bucketId} bucket should exist`).toBeDefined();
  return bucket as BucketItem;
}

describe('partner need walkthrough', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints year-by-year schedule and alternative PV assumptions', () => {
    const { profile, retirementForBuckets, bucketEntries } = buildPartnerScenario();
    const plan = calculateRetirementPlan(retirementForBuckets, profile);
    const schedule = buildRetirementYearSchedule(retirementForBuckets, profile);
    const realRate = realReturnPercent(
      retirementForBuckets.expectedAnnualReturn,
      retirementForBuckets.inflationAssumption
    ) / 100;

    const desiredNet = grossToNetRetirementIncome(
      retirementForBuckets.desiredAnnualGrossIncome,
      retirementForBuckets
    );
    const fundingYears = retirementFundingYears(retirementForBuckets, profile);
    const endAge = retirementHorizonEndAge(retirementForBuckets, profile);

    const grossWithdrawals = schedule.rows.map((r) => r.grossPortfolioWithdrawal);
    const firstYearGross = grossWithdrawals[0] ?? 0;
    const avgGross =
      grossWithdrawals.reduce((s, w) => s + w, 0) / Math.max(grossWithdrawals.length, 1);

    // Common external-agent shortcuts
    const levelPv30 = presentValueOfRetirementWithdrawals(firstYearGross, 30, 7.5, 2.5);
    const levelPv29 = presentValueOfRetirementWithdrawals(firstYearGross, 29, 7.5, 2.5);
    const levelPv30NoSs = presentValueOfRetirementWithdrawals(
      grossToNetRetirementIncome(retirementForBuckets.desiredAnnualGrossIncome, retirementForBuckets) /
        (1 - 0.15), // rough 15% tax guess
      30,
      7.5,
      2.5
    );

    const bothSsFrom65 = grossWithdrawals.map((_, i) => {
      const age = retirementForBuckets.retirementAge + i;
      const partnerAge =
        (profile.partnerAge || 38) + (age - (profile.userAge || 40));
      let known = 0;
      if (age >= 65) known += retirementForBuckets.socialSecurityEstimate;
      if (partnerAge >= 65) known += retirementForBuckets.partnerSocialSecurityEstimate;
      const netKnown = grossToNetRetirementIncome(known, retirementForBuckets);
      const netGap = Math.max(0, desiredNet - netKnown);
      return netGap / 0.85; // flat 15% tax on withdrawals — wrong but common
    });
    const pvBothSs65 = presentValueOfScheduledGrossWithdrawals(bothSsFrom65, realRate);

    // Solo planningMode suppresses Jordan's continuing employment wages
    const scheduleNoJordanWork = buildRetirementYearSchedule(retirementForBuckets, {
      ...profile,
      planningMode: 'solo' as const,
    });

    const pvNoJordanWork = Math.round(scheduleNoJordanWork.requiredPortfolioTarget);

    const constant81250 = presentValueOfRetirementWithdrawals(81_250, 30, 7.5, 2.5);
    const constant57547 = presentValueOfRetirementWithdrawals(57_547, 30, 7.5, 2.5);

    const output = {
      appRequiredPortfolioTarget: plan.requiredPortfolioTarget,
      otherAgentReported: 1_262_625,
      difference: 1_262_625 - plan.requiredPortfolioTarget,
      differencePct:
        ((1_262_625 - plan.requiredPortfolioTarget) / plan.requiredPortfolioTarget) * 100,
      inputs: {
        desiredAnnualGrossIncome: retirementForBuckets.desiredAnnualGrossIncome,
        desiredAnnualNetIncome: Math.round(desiredNet),
        householdGross: 167_000,
        incomeReplacementPercent: retirementForBuckets.incomeReplacementPercent,
        socialSecurityEstimate: retirementForBuckets.socialSecurityEstimate,
        partnerSocialSecurityEstimate: retirementForBuckets.partnerSocialSecurityEstimate,
        socialSecurityClaimAge: retirementForBuckets.socialSecurityClaimAge,
        partnerSocialSecurityClaimAge: retirementForBuckets.partnerSocialSecurityClaimAge,
        retirementAge: retirementForBuckets.retirementAge,
        partnerRetirementAge: retirementForBuckets.partnerRetirementAge,
        lifeExpectancy: retirementForBuckets.lifeExpectancy,
        partnerLifeExpectancy: retirementForBuckets.partnerLifeExpectancy,
        fundingYears,
        endAgeInclusive: endAge,
        scheduleYearCount: schedule.rows.length,
        realReturnPercent: realRate * 100,
        rothShare:
          retirementForBuckets.rothBalance /
          (retirementForBuckets.traditionalBalance + retirementForBuckets.rothBalance),
      },
      firstRetirementYear: schedule.rows[0],
      yearsWithZeroWithdrawal: schedule.rows.filter((r) => r.grossPortfolioWithdrawal <= 1).length,
      yearByYear: schedule.rows.map((r) => ({
        alexAge: r.age,
        jordanAge: r.partnerAge,
        alexSsGross:
          retirementForBuckets.socialSecurityMode !== 'excluded' &&
          r.age >= retirementForBuckets.socialSecurityClaimAge
            ? retirementForBuckets.socialSecurityEstimate
            : 0,
        jordanSsGross:
          retirementForBuckets.partnerSocialSecurityMode !== 'excluded' &&
          r.partnerAge >= retirementForBuckets.partnerSocialSecurityClaimAge
            ? retirementForBuckets.partnerSocialSecurityEstimate
            : 0,
        grossPortfolioWithdrawal: Math.round(r.grossPortfolioWithdrawal),
        netPortfolioNeed: Math.round(r.netPortfolioNeed),
      })),
      alternativeCalculations: {
        levelPaymentUsingFirstYearGross_30y: Math.round(levelPv30),
        levelPaymentUsingFirstYearGross_29y: Math.round(levelPv29),
        actualSchedulePv: Math.round(schedule.requiredPortfolioTarget),
        avgAnnualGrossWithdrawal: Math.round(avgGross),
        levelPaymentUsingAvgGross_30y: Math.round(
          presentValueOfRetirementWithdrawals(avgGross, 30, 7.5, 2.5)
        ),
        bothSsFromAge65_flatTaxPv: Math.round(pvBothSs65),
        noJordanContinuingEmploymentPv: pvNoJordanWork,
        constantGross81250_30y: Math.round(constant81250),
        constantGross57547_30y: Math.round(constant57547),
        sumGrossWithdrawalsUndiscounted: Math.round(
          grossWithdrawals.reduce((s, w) => s + w, 0)
        ),
      },
      bucketsTabTarget: bucketById(bucketEntries, 'retirement').target,
    };

    // eslint-disable-next-line no-console
    console.log('\n' + JSON.stringify(output, null, 2) + '\n');
    expect(plan.requiredPortfolioTarget).toBeGreaterThan(0);
  });
});
