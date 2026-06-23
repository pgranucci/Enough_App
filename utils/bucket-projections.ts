/** @deprecated Import from `@/src/core/shared/projection` or `@/src/core/buckets/bucket-projection`. */
export {
  calculateProjection,
  projectFutureValue,
  type ProjectionParams,
  type ProjectionResult,
} from '@/src/core/buckets/bucket-projection';

export { addMonthsToIso } from '@/src/core/shared/dates';

export {
  COMPLETION_SEARCH_MAX_MONTHS,
  estimateCompletionMonths,
  futureValueNominal,
  inflateAmount,
  monthsUntilBalanceReachesTarget,
  monthsUntilInflatedTarget,
  monthsUntilTarget,
  PROJECTION_MAX_MONTHS,
  realReturnPercent,
  toRealValue,
} from '@/src/core/shared/projection';
