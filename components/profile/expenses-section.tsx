import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ThemedText } from '@/components/themed-text';
import { HOUSING_SITUATION_OPTIONS } from '@/constants/expenses';
import type { ExpenseInputs, HousingSituation, NonMortgageDebtLine, ProfileInputs } from '@/constants/profile';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  formatCurrency,
  formatWholeNumberDisplay,
  parseUsdWholeToNumber,
} from '@/utils/format';
import {
  formatMonthYearDisplay,
  formatMonthYearInput,
  parseMonthYearToIso,
} from '@/utils/month-year-input';

function monthYearOnChange(
  text: string,
  onStore: (maturityDate: string) => void
) {
  const formatted = formatMonthYearInput(text);
  const iso = parseMonthYearToIso(formatted);
  onStore(iso ?? formatted);
}

function newDebtLineId(): string {
  return `debt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function debtDisplayName(name: string, index: number): string {
  const trimmed = name.trim();
  return trimmed || `Debt #${index + 1}`;
}

type DebtCardProps = {
  debt: NonMortgageDebtLine;
  index: number;
  onUpdate: (patch: Partial<NonMortgageDebtLine>) => void;
  onRemove: () => void;
};

function DebtCard({ debt, index, onUpdate, onRemove }: DebtCardProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(true);
  const title = debtDisplayName(debt.name, index);
  const endDateLabel = formatMonthYearDisplay(debt.maturityDate);

  return (
    <View
      style={[
        styles.debtCard,
        { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
      ]}>
      <View style={styles.debtHeader}>
        <View style={styles.debtHeaderText}>
          <TextInput
            value={debt.name}
            onChangeText={(name) => onUpdate({ name })}
            placeholder={`Debt #${index + 1}`}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            style={[styles.debtTitleInput, { color: colors.text }]}
          />
          {!expanded ? (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              {formatCurrency(debt.monthlyPayment)}/Mo
              {endDateLabel ? ` · ${endDateLabel}` : ''}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? `Collapse ${title}` : `Expand ${title}`}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.debtBody}>
          <ProfileInputField
            label="Monthly Payment"
            value={formatWholeNumberDisplay(debt.monthlyPayment, { allowZero: true })}
            onChange={(text) => onUpdate({ monthlyPayment: parseUsdWholeToNumber(text) })}
            placeholder="0"
            suffix="$"
            keyboardType="number-pad"
          />
          <View style={styles.field}>
            <ThemedText type="captionMedium">Estimated End Date</ThemedText>
            <TextInput
              value={formatMonthYearDisplay(debt.maturityDate)}
              onChangeText={(text) =>
                monthYearOnChange(text, (maturityDate) => onUpdate({ maturityDate }))
              }
              placeholder="MM/YYYY"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              autoCapitalize="none"
              style={[
                styles.dateInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            />
          </View>
          <Pressable onPress={onRemove} hitSlop={8}>
            <ThemedText type="captionMedium" style={{ color: '#B45309' }}>
              Remove Debt
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type ExpensesSectionProps = {
  expenses: ExpenseInputs;
  updateProfile: (patch: Partial<ProfileInputs>) => void;
  embedded?: boolean;
};

const DEBT_INFO =
  'Non-mortgage debts are obligations like credit cards, car loans, and student loans. Add each debt’s monthly payment and when you expect it to be paid off.';

const ESSENTIAL_EXPENSES_INFO =
  'Essential expenses are need-based monthly costs such as food, utilities, insurance, and transportation. This does not include housing or debt payments listed elsewhere.';

const DISCRETIONARY_EXPENSES_INFO =
  'Discretionary expenses are non-essential monthly spending such as dining out, travel, hobbies, and entertainment.';

const MORTGAGE_PAYOFF_DATE_INFO = 'When you expect the mortgage to be paid off (month and year).';

const HOUSING_COSTS_INFO =
  'Optional monthly housing costs beyond a mortgage, such as HOA fees, property taxes, or insurance if not included in your mortgage payment.';

export function ExpensesSection({
  expenses,
  updateProfile,
  embedded = false,
}: ExpensesSectionProps) {
  const { colors } = useAppTheme();

  const setExpenses = (next: ExpenseInputs) => updateProfile({ expenses: next });

  const updateDebt = (id: string, patch: Partial<NonMortgageDebtLine>) => {
    setExpenses({
      ...expenses,
      nonMortgageDebts: expenses.nonMortgageDebts.map((d) =>
        d.id === id ? { ...d, ...patch } : d
      ),
    });
  };

  const removeDebt = (id: string) => {
    setExpenses({
      ...expenses,
      nonMortgageDebts: expenses.nonMortgageDebts.filter((d) => d.id !== id),
    });
  };

  const setHousingSituation = (housingSituation: HousingSituation) => {
    if (housingSituation === 'rent') {
      setExpenses({
        ...expenses,
        housingSituation,
        mortgage: {
          ...expenses.mortgage,
          hasMortgage: false,
          mortgagePaidOff: false,
          monthlyPayment: 0,
          maturityDate: '',
        },
      });
      return;
    }
    // Clear rent-era housing cost so it is not double-counted with a mortgage payment.
    setExpenses({ ...expenses, housingSituation, monthlyHousingCost: 0 });
  };

  const Root = embedded ? View : View;
  const rootStyle = styles.root;

  return (
    <Root style={rootStyle}>
      <View style={styles.subsection}>
        <ProfileInfoLabel label="Housing" />
        <View style={styles.optionRow}>
          {HOUSING_SITUATION_OPTIONS.map((option) => {
            const selected = expenses.housingSituation === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setHousingSituation(option.id)}
                style={[
                  styles.situationOption,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected ? `${colors.tint}14` : colors.surface,
                  },
                ]}>
                <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        {expenses.housingSituation === 'rent' ? (
          <ProfileInputField
            label="Monthly Rent"
            value={formatWholeNumberDisplay(expenses.monthlyHousingCost, { allowZero: true })}
            onChange={(text) =>
              setExpenses({
                ...expenses,
                monthlyHousingCost: parseUsdWholeToNumber(text),
              })
            }
            placeholder="0"
            suffix="$"
            keyboardType="number-pad"
          />
        ) : (
          <>
            <View style={styles.toggleRow}>
              <ThemedText type="captionMedium">I Have a Mortgage</ThemedText>
              <Switch
                value={expenses.mortgage.hasMortgage}
                onValueChange={(hasMortgage) =>
                  setExpenses({
                    ...expenses,
                    monthlyHousingCost: hasMortgage ? 0 : expenses.monthlyHousingCost,
                    mortgage: {
                      ...expenses.mortgage,
                      hasMortgage,
                      mortgagePaidOff: false,
                      monthlyPayment: hasMortgage ? expenses.mortgage.monthlyPayment : 0,
                      maturityDate: hasMortgage ? expenses.mortgage.maturityDate : '',
                    },
                  })
                }
                trackColor={{ false: colors.track, true: `${colors.tint}66` }}
                thumbColor={expenses.mortgage.hasMortgage ? colors.tint : colors.textSecondary}
              />
            </View>

            {expenses.mortgage.hasMortgage ? (
              <>
                <ProfileInputField
                  label="Monthly Mortgage Payment"
                  value={formatWholeNumberDisplay(expenses.mortgage.monthlyPayment, {
                    allowZero: true,
                  })}
                  onChange={(text) =>
                    setExpenses({
                      ...expenses,
                      mortgage: {
                        ...expenses.mortgage,
                        monthlyPayment: parseUsdWholeToNumber(text),
                      },
                    })
                  }
                  placeholder="2,500"
                  suffix="$"
                  keyboardType="number-pad"
                />
                <View style={styles.field}>
                  <ProfileInfoLabel
                    label="Estimated Payoff Date"
                    infoMessage={MORTGAGE_PAYOFF_DATE_INFO}
                  />
                  <TextInput
                    value={formatMonthYearDisplay(expenses.mortgage.maturityDate)}
                    onChangeText={(text) =>
                      monthYearOnChange(text, (maturityDate) =>
                        setExpenses({
                          ...expenses,
                          mortgage: { ...expenses.mortgage, maturityDate },
                        })
                      )
                    }
                    placeholder="MM/YYYY"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    style={[
                      styles.dateInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                  />
                </View>
              </>
            ) : (
              <ProfileInputField
                label="Monthly Housing Costs (HOA, Taxes, Etc.)"
                value={formatWholeNumberDisplay(expenses.monthlyHousingCost, { allowZero: true })}
                onChange={(text) =>
                  setExpenses({
                    ...expenses,
                    monthlyHousingCost: parseUsdWholeToNumber(text),
                  })
                }
                placeholder="0"
                suffix="$"
                keyboardType="number-pad"
                infoMessage={HOUSING_COSTS_INFO}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.subsection}>
        <ProfileInputField
          label="Monthly Essential Expenses"
          infoMessage={ESSENTIAL_EXPENSES_INFO}
          value={formatWholeNumberDisplay(expenses.monthlyEssentialsExHousing, {
            allowZero: true,
          })}
          onChange={(text) =>
            setExpenses({
              ...expenses,
              monthlyEssentialsExHousing: parseUsdWholeToNumber(text),
            })
          }
          placeholder="0"
          suffix="$"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.subsection}>
        <ProfileInputField
          label="Monthly Discretionary Expenses"
          infoMessage={DISCRETIONARY_EXPENSES_INFO}
          value={formatWholeNumberDisplay(expenses.monthlyDiscretionary, { allowZero: true })}
          onChange={(text) =>
            setExpenses({
              ...expenses,
              monthlyDiscretionary: parseUsdWholeToNumber(text),
            })
          }
          placeholder="0"
          suffix="$"
          keyboardType="number-pad"
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.subsection}>
        <ProfileInfoLabel label="Debt" infoMessage={DEBT_INFO} />

        {expenses.nonMortgageDebts.map((debt, index) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            index={index}
            onUpdate={(patch) => updateDebt(debt.id, patch)}
            onRemove={() => removeDebt(debt.id)}
          />
        ))}

        <Pressable
          onPress={() =>
            setExpenses({
              ...expenses,
              nonMortgageDebts: [
                ...expenses.nonMortgageDebts,
                { id: newDebtLineId(), name: '', monthlyPayment: 0, maturityDate: '' },
              ],
            })
          }
          style={({ pressed }) => [
            styles.addButton,
            { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
          ]}>
          <ThemedText type="captionMedium" style={{ color: colors.tint }}>
            + Add Debt
          </ThemedText>
        </Pressable>
      </View>
    </Root>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.xl,
  },
  subsection: {
    gap: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  situationOption: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    gap: Spacing.sm,
  },
  dateInput: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  debtCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  debtHeaderText: {
    flex: 1,
    gap: Spacing.xs,
  },
  debtTitleInput: {
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    paddingVertical: 0,
    minHeight: 24,
  },
  debtBody: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
});
