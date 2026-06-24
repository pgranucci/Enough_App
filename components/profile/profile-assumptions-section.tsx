import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ProfilePercentInputField } from '@/components/profile/profile-percent-input-field';
import type { PlanningMode } from '@/constants/profile';
import {
  DEFAULT_INFLATION_ASSUMPTION,
  DEFAULT_LIFE_EXPECTANCY,
  DEFAULT_RETIREMENT_INVESTMENT_RETURN,
  INVESTMENT_GROWTH_ASSUMPTION_FIELDS,
  INVESTMENT_GROWTH_PRESET_RATE,
  portfolioGrowthRate,
  type InvestmentGrowthPreset,
  type RetirementInputs,
} from '@/constants/retirement';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { parseAgeInput } from '@/utils/profile-age';

const RETIREMENT_RETURN_INFO = `The default investment return assumption during retirement is ${DEFAULT_RETIREMENT_INVESTMENT_RETURN}% annually before inflation. Historically, this is slightly lower than the long-term average return of a balanced 50/50 portfolio. This rate is used to estimate the growth of the user’s investment accounts throughout retirement, and can be adjusted at any time.`;

const LIFE_EXPECTANCY_INFO = `Default is age ${DEFAULT_LIFE_EXPECTANCY}. Leave blank to use the default, or enter a different age.`;

type ProfileAssumptionsSectionProps = {
  planningMode: PlanningMode;
  retirement: RetirementInputs;
  updateRetirement: (patch: Partial<RetirementInputs>) => void;
};

function growthFieldValue(
  key: InvestmentGrowthPreset,
  retirement: RetirementInputs
): number {
  const value = portfolioGrowthRate(key, retirement.customInvestmentGrowthRates);
  if (key === 'shortTerm') return INVESTMENT_GROWTH_PRESET_RATE.shortTerm;
  return value > 0 ? value : INVESTMENT_GROWTH_PRESET_RATE[key];
}

function lifeExpectancyDisplayValue(stored: number): string {
  return String(stored > 0 ? stored : DEFAULT_LIFE_EXPECTANCY);
}

function percentAssumptionValue(stored: number, fallback: number): number {
  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

function AssumptionDivider() {
  const { colors } = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function AssumptionRow({
  children,
  showDivider = true,
}: {
  children: ReactNode;
  showDivider?: boolean;
}) {
  return (
    <>
      <View style={styles.row}>{children}</View>
      {showDivider ? <AssumptionDivider /> : null}
    </>
  );
}

export function ProfileAssumptionsSection({
  planningMode,
  retirement,
  updateRetirement,
}: ProfileAssumptionsSectionProps) {
  const { colors } = useAppTheme();
  const withPartner = planningMode === 'partner';

  const setGrowthRate = (key: InvestmentGrowthPreset, value: number) => {
    updateRetirement({
      investmentGrowthMode: 'custom',
      customInvestmentGrowthRates: {
        ...retirement.customInvestmentGrowthRates,
        [key]: value,
        shortTerm: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
      },
      assumedCashGrowthRate: INVESTMENT_GROWTH_PRESET_RATE.shortTerm,
    });
  };

  return (
    <View
      style={[
        styles.listCard,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}>
      {INVESTMENT_GROWTH_ASSUMPTION_FIELDS.map(({ key, label, placeholder, locked }) => (
        <AssumptionRow key={key}>
          <ProfilePercentInputField
            label={label}
            layout="inline"
            value={growthFieldValue(key, retirement)}
            onChange={(value) => setGrowthRate(key, value)}
            placeholder={placeholder}
            editable={!locked}
            showZeroValue
          />
        </AssumptionRow>
      ))}

      <AssumptionRow>
        <ProfilePercentInputField
          label="Annual Inflation"
          layout="inline"
          value={percentAssumptionValue(
            retirement.inflationAssumption,
            DEFAULT_INFLATION_ASSUMPTION
          )}
          onChange={(inflationAssumption) => updateRetirement({ inflationAssumption })}
          placeholder={String(DEFAULT_INFLATION_ASSUMPTION)}
          showZeroValue
        />
      </AssumptionRow>

      <AssumptionRow>
        <ProfilePercentInputField
          label="Retirement Investment Return Assumption"
          infoMessage={RETIREMENT_RETURN_INFO}
          layout="inline"
          value={percentAssumptionValue(
            retirement.expectedAnnualReturn,
            DEFAULT_RETIREMENT_INVESTMENT_RETURN
          )}
          onChange={(expectedAnnualReturn) => updateRetirement({ expectedAnnualReturn })}
          placeholder={String(DEFAULT_RETIREMENT_INVESTMENT_RETURN)}
          showZeroValue
        />
      </AssumptionRow>

      <AssumptionRow showDivider={false}>
        {withPartner ? (
          <View style={styles.lifeExpectancyBlock}>
            <ProfileInfoLabel label="Life Expectancy" infoMessage={LIFE_EXPECTANCY_INFO} />
            <View style={styles.lifeExpectancyRow}>
              <View style={styles.lifeExpectancyField}>
                <ProfileInputField
                  label="Your Life Expectancy"
                  value={lifeExpectancyDisplayValue(retirement.lifeExpectancy)}
                  onChange={(text) =>
                    updateRetirement({ lifeExpectancy: parseAgeInput(text) })
                  }
                  placeholder={String(DEFAULT_LIFE_EXPECTANCY)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.lifeExpectancyField}>
                <ProfileInputField
                  label="Partner's Life Expectancy"
                  value={lifeExpectancyDisplayValue(retirement.partnerLifeExpectancy)}
                  onChange={(text) =>
                    updateRetirement({ partnerLifeExpectancy: parseAgeInput(text) })
                  }
                  placeholder={String(DEFAULT_LIFE_EXPECTANCY)}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        ) : (
          <ProfileInputField
            label="Life Expectancy"
            infoMessage={LIFE_EXPECTANCY_INFO}
            value={lifeExpectancyDisplayValue(retirement.lifeExpectancy)}
            onChange={(text) => updateRetirement({ lifeExpectancy: parseAgeInput(text) })}
            placeholder={String(DEFAULT_LIFE_EXPECTANCY)}
            keyboardType="number-pad"
          />
        )}
      </AssumptionRow>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  lifeExpectancyBlock: {
    gap: Spacing.md,
  },
  lifeExpectancyRow: {
    gap: Spacing.lg,
  },
  lifeExpectancyField: {
    alignSelf: 'stretch',
  },
});
