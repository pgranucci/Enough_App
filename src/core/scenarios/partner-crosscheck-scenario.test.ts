/**
 * Partner planning cross-check — prints locked outputs for manual / external AI verification.
 *
 * Run: npx vitest run src/core/scenarios/partner-crosscheck-scenario.test.ts --reporter=verbose
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { computeEnoughScoreFromBuckets } from '@/src/core/enough-score/compute-enough-score';
import { buildEnoughScoreGoalProgressRows } from '@/src/core/enough-score/enough-score-goal-progress';
import { calculateExcessSummary, flattenBucketsForExcess } from '@/utils/bucket-excess';
import {
  retirementBucketReadinessPercent,
  retirementBucketReadinessMeetsTarget,
} from '@/utils/retirement-bucket-readiness';
import { calculateRetirementPlan, retirementFundingYears } from '@/utils/retirement-planning';
import { getHouseholdAnnualIncome, getPartnerAnnualIncome } from '@/constants/profile';
import { isBucketGroup, type BucketEntry, type BucketItem } from '@/constants/buckets';
import { buildPartnerScenario } from './partner-crosscheck-fixture';

const AS_OF = new Date('2026-06-05T12:00:00Z');

function bucketById(entries: BucketEntry[], bucketId: string): BucketItem {
  const bucket = entries.find((entry) => !isBucketGroup(entry) && entry.id === bucketId);
  expect(bucket, `${bucketId} bucket should exist`).toBeDefined();
  return bucket as BucketItem;
}

describe('partner cross-check scenario', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prints app displays and calculation trail', () => {
    const scenario = buildPartnerScenario();
    const { profile, retirementForBuckets, expenseTargets, bucketEntries } = scenario;

    const enoughScoreResult = computeEnoughScoreFromBuckets(bucketEntries);
    const excessLines = flattenBucketsForExcess(bucketEntries);
    const excessSummary = calculateExcessSummary(excessLines, {
      emergency: true,
      slush: true,
      retirement: true,
      'custom-house': true,
    });

    const retirementBucket = bucketById(bucketEntries, 'retirement');
    const emergencyBucket = bucketById(bucketEntries, 'emergency');
    const plan = calculateRetirementPlan(retirementForBuckets, profile);
    const readinessPercent = retirementBucketReadinessPercent(retirementBucket);
    const goalRows = buildEnoughScoreGoalProgressRows(excessLines, enoughScoreResult);
    const fundingYears = retirementFundingYears(retirementForBuckets, profile);

    const output = {
      scenarioName: 'Partner Alex & Jordan — Texas renters, staggered retirement',
      asOfDate: AS_OF.toISOString().slice(0, 10),
      inputs: {
        profile: {
          planningMode: profile.planningMode,
          filingStatus: profile.filingStatus,
          userName: profile.userName,
          partnerName: profile.partnerName,
          userDateOfBirth: profile.dateOfBirth,
          partnerDateOfBirth: profile.partnerDateOfBirth,
          userAnnualIncome: profile.annualIncome,
          partnerAnnualIncome: getPartnerAnnualIncome(profile),
          householdGrossIncome: getHouseholdAnnualIncome(profile),
          monthlyHousingCost: profile.expenses.monthlyHousingCost,
          monthlyEssentialsExHousing: profile.expenses.monthlyEssentialsExHousing,
          monthlyDiscretionary: profile.expenses.monthlyDiscretionary,
          emergencyCoverageMonths: profile.expenses.emergencyCoverageMonths,
          slushCoverageMonths: profile.expenses.slushCoverageMonths,
        },
        retirement: {
          userRetirementAge: retirementForBuckets.retirementAge,
          partnerRetirementAge: retirementForBuckets.partnerRetirementAge,
          userLifeExpectancy: retirementForBuckets.lifeExpectancy,
          partnerLifeExpectancy: retirementForBuckets.partnerLifeExpectancy,
          retirementFundingYears: fundingYears,
          fundingHorizonNote:
            'max(userLE − userRetireAge, partnerLE − partnerRetireAge)',
          desiredAnnualGrossIncome: retirementForBuckets.desiredAnnualGrossIncome,
          userSocialSecurity: retirementForBuckets.socialSecurityEstimate,
          partnerSocialSecurity: retirementForBuckets.partnerSocialSecurityEstimate,
          expectedAnnualReturn: retirementForBuckets.expectedAnnualReturn,
          inflationAssumption: retirementForBuckets.inflationAssumption,
          state: retirementForBuckets.retirementStateOfResidence,
          filingStatus: retirementForBuckets.retirementFilingStatus,
        },
        accounts: {
          emergency: { balance: 28_000, mix: 'cash' },
          slush: { balance: 5_000, mix: 'cash' },
          house: { balance: 7_000, mix: 'cash', target: 12_000 },
          '401k': {
            preTax: 180_000,
            roth: 60_000,
            mix: 'balanced',
            employeePreTaxPct: 8,
            employerMatchPct: 4,
            salaryBaseForDeferrals: profile.annualIncome,
          },
        },
        derivedTargets: expenseTargets,
      },
      enoughScoreLandingPage: {
        enoughScore: enoughScoreResult.enoughScore,
        goalsSection: goalRows.map((row) => ({
          name: row.name,
          percent: row.percentLabel,
          subtitle: row.subtitle,
        })),
        weightedContributions: enoughScoreResult.weightedContributions,
        completions: {
          emergency: enoughScoreResult.emergencyCompletion,
          retirement: enoughScoreResult.retirementCompletion,
          slush: enoughScoreResult.slushCompletion,
          customGoals: enoughScoreResult.customGoalBreakdown,
        },
      },
      bucketsTab: {
        emergency: {
          current: emergencyBucket,
          ringPercent: Math.round(
            (emergencyBucket.current /
              emergencyBucket.target) *
              100
          ),
        },
        slush: {
          current: bucketById(bucketEntries, 'slush'),
        },
        retirement: {
          estimatedRetirementNeed: retirementBucket.target,
          estimatedRetirementBalance: retirementBucket.projectedGrossEquivalent,
          currentAmount: retirementBucket.current,
          ringPercent: readinessPercent,
        },
        houseDownPayment: bucketById(bucketEntries, 'custom-house'),
      },
      myExcessTab: {
        sumOfAllExcessFunds: excessSummary.totalExcess,
        bucketsWithExcess: excessSummary.includedLines.map((line) => ({
          name: line.name,
          excess: line.excess,
        })),
        allBuckets: excessSummary.lines.map((line) => ({
          name: line.name,
          current: line.current,
          target: line.target,
          excess: line.excess,
        })),
        retirementPace: {
          estimatedRetirementReadiness: readinessPercent,
          estimatedRetirementBalance: retirementBucket.projectedGrossEquivalent,
          estimatedRetirementNeed: retirementBucket.target,
          paceStatus: retirementBucketReadinessMeetsTarget(retirementBucket)
            ? 'Ahead'
            : 'Behind',
        },
      },
      partnerSpecificPlanDetails: {
        inflatedSocialSecurity: plan.inflatedSocialSecurity,
        inflatedPartnerSocialSecurity: plan.inflatedPartnerSocialSecurity,
        desiredAnnualNetIncomeTarget: plan.desiredAnnualNetIncomeTarget,
        annualGrossWithdrawalFromPortfolio: plan.annualGrossWithdrawalFromPortfolio,
        retirementIncomeGap: plan.retirementIncomeGap,
      },
      calculationTrail: {
        emergencyMonthlyFloor: 5_000,
        emergencyTarget: expenseTargets.emergency,
        slushMonthlyTotal: 5_400,
        slushTarget: expenseTargets.slush,
        retirementFundingYearsFormula:
          'max(userLifeExpectancy − userRetirementAge, partnerLifeExpectancy − partnerRetirementAge)',
        retirementReadinessFormula:
          'min(100, round(projectedGrossEquivalent ÷ estimatedRetirementNeed × 100)) from Buckets bucket',
        enoughScoreFormula:
          '35% emergency + 35% retirement + 15% slush + 15% custom (split evenly); clamp 1–100',
        excessFormula: 'max(0, current − target)',
      },
    };

    // eslint-disable-next-line no-console
    console.log('\n' + JSON.stringify(output, null, 2) + '\n');
    expect(output.enoughScoreLandingPage.enoughScore).toBeGreaterThan(0);
  });
});
