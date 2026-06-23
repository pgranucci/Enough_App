import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import {
  FINANCIAL_ACCOUNT_TYPE_OPTIONS,
  type FinancialAccountType,
} from '@/constants/financial-accounts';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountTypePickerProps = {
  value: FinancialAccountType;
  onChange: (value: FinancialAccountType) => void;
};

export function AccountTypePicker({ value, onChange }: AccountTypePickerProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const label =
    FINANCIAL_ACCOUNT_TYPE_OPTIONS.find((option) => option.id === value)?.label ??
    'Select Account Type';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: colors.border, backgroundColor: colors.inputBackground },
        ]}>
        <ThemedText type="default">{label}</ThemedText>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.canvas }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="sectionTitle" style={styles.sheetTitle}>
              Account Type
            </ThemedText>
            <ScrollView keyboardShouldPersistTaps="handled">
              {FINANCIAL_ACCOUNT_TYPE_OPTIONS.map((option) => {
                const selected = value === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? `${colors.tint}14` : colors.surface,
                        borderColor: selected ? colors.tint : colors.border,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sheetTitle: {
    marginBottom: Spacing.sm,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
