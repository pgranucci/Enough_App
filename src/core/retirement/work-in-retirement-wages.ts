import type { RetirementOtherIncomeStream } from '@/constants/retirement';
import {
  annualContinuingEmploymentGrossBreakdownAtAges,
  type ContinuingEmploymentProfile,
} from '@/src/core/retirement/continuing-employment-income';
import type { RetirementInputs } from '@/constants/retirement';

export type WorkWagesBreakdown = {
  self: number;
  partner: number;
  total: number;
};

function isStreamActiveAtAge(stream: RetirementOtherIncomeStream, age: number): boolean {
  const atAge = Math.min(120, Math.max(0, Math.round(age)));
  const start = Math.min(120, Math.max(0, Math.round(stream.startAge)));
  const end = Math.min(120, Math.max(0, Math.round(stream.endAge)));
  if (end > 0 && start > end) return false;
  if (atAge < start) return false;
  if (end > 0 && atAge > end) return false;
  return true;
}

function workStreamWagesAtAges(
  streams: RetirementOtherIncomeStream[],
  selfAge: number,
  partnerAge: number
): WorkWagesBreakdown {
  let self = 0;
  let partner = 0;

  for (const stream of streams) {
    if (!stream.isWorkInRetirement) continue;
    const age = stream.assignedTo === 'partner' ? partnerAge : selfAge;
    if (!isStreamActiveAtAge(stream, age)) continue;
    const annual = Math.max(0, stream.monthlyGross) * 12;
    if (stream.assignedTo === 'partner') partner += annual;
    else self += annual;
  }

  return { self, partner, total: self + partner };
}

/** Gross W-2 wages in retirement: continuing employment + streams marked work in retirement. */
export function annualWorkInRetirementWagesAtAges(
  streams: RetirementOtherIncomeStream[],
  profile: ContinuingEmploymentProfile | undefined,
  inputs: Pick<RetirementInputs, 'retirementAge' | 'partnerRetirementAge'>,
  selfAge: number,
  partnerAge: number
): WorkWagesBreakdown {
  const continuing = annualContinuingEmploymentGrossBreakdownAtAges(
    profile,
    inputs,
    selfAge,
    partnerAge
  );
  const fromStreams = workStreamWagesAtAges(streams, selfAge, partnerAge);

  return {
    self: continuing.self + fromStreams.self,
    partner: continuing.partner + fromStreams.partner,
    total: continuing.self + continuing.partner + fromStreams.total,
  };
}
