import { describe, expect, it } from 'vitest';

import { calculateRetirementPlan } from '@/utils/retirement-planning';
import { makeProfile, makeRetirement } from '@/src/core/retirement/fixtures';

describe('life expectancy impact on readiness', () => {
  const profileSolo = makeProfile({ planningMode: 'solo', userAge: 45 });
  const base = makeRetirement({
    currentAge: 45,
    retirementAge: 65,
    lifeExpectancy: 95,
    partnerLifeExpectancy: 95,
    partnerRetirementAge: 65,
    traditionalBalance: 200_000,
    monthlyContributions: 1_000,
  });

  it('solo: lowering user LE shortens horizon (partner fields ignored)', () => {
    const le85 = calculateRetirementPlan({ ...base, lifeExpectancy: 85 }, profileSolo);
    const le75 = calculateRetirementPlan({ ...base, lifeExpectancy: 75 }, profileSolo);
    expect(le85.retirementFundingYears).toBe(20);
    expect(le75.retirementFundingYears).toBe(10);
    expect(le75.requiredPortfolioTarget).toBeLessThan(le85.requiredPortfolioTarget);
    expect(le75.projectedReadinessPercent).toBeGreaterThanOrEqual(
      le85.projectedReadinessPercent
    );
  });

  it('solo: lowering user LE works when partner span is not longer', () => {
    const lowBalance = { ...base, traditionalBalance: 50_000, monthlyContributions: 200 };
    const le85 = calculateRetirementPlan(
      { ...lowBalance, lifeExpectancy: 85, partnerLifeExpectancy: 85, partnerRetirementAge: 65 },
      profileSolo
    );
    const le95 = calculateRetirementPlan(
      { ...lowBalance, lifeExpectancy: 95, partnerLifeExpectancy: 95, partnerRetirementAge: 65 },
      profileSolo
    );
    expect(le85.requiredPortfolioTarget).toBeLessThan(le95.requiredPortfolioTarget);
    expect(le85.projectedReadinessPercent).toBeGreaterThan(le95.projectedReadinessPercent);
    expect(le85.retirementFundingYears).toBe(20);
    expect(le95.retirementFundingYears).toBe(30);
  });

  it('partner: only partner LE matters when partner span is longer than user', () => {
    const profilePartner = makeProfile({
      planningMode: 'partner',
      userAge: 45,
      partnerAge: 43,
    });
    const lowBalance = {
      ...base,
      traditionalBalance: 50_000,
      monthlyContributions: 200,
      partnerRetirementAge: 67,
      lifeExpectancy: 85,
      partnerLifeExpectancy: 95,
    };
    const partner92 = calculateRetirementPlan(
      { ...lowBalance, partnerLifeExpectancy: 92 },
      profilePartner
    );
    const partner95 = calculateRetirementPlan(
      { ...lowBalance, partnerLifeExpectancy: 95 },
      profilePartner
    );
    expect(partner92.requiredPortfolioTarget).toBeLessThan(partner95.requiredPortfolioTarget);
    expect(partner92.projectedReadinessPercent).toBeGreaterThan(
      partner95.projectedReadinessPercent
    );
    expect(partner92.retirementFundingYears).toBe(25);
    expect(partner95.retirementFundingYears).toBe(28);
  });
});
