import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DEBT_NAME_OPTIONS } from '@/constants/expenses';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type DebtNamePickerProps = {
  value: string;
  onChange: (name: string) => void;
};

export function DebtNamePicker({ value, onChange }: DebtNamePickerProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const display = value.trim() || 'Select Debt Type';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: colors.border, backgroundColor: colors.inputBackground },
        ]}>
        <ThemedText type="default" style={{ color: value.trim() ? colors.text : colors.textSecondary }}>
          {display}
        </ThemedText>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.canvas }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="sectionTitle" style={styles.sheetTitle}>
              Debt Type
            </ThemedText>
            <ScrollView keyboardShouldPersistTaps="handled">
              {DEBT_NAME_OPTIONS.map((option) => {
                const selected = value === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? `${colors.tint}14` : colors.surface,
                        borderColor: selected ? colors.tint : colors.border,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold">{option}</ThemedText>
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
