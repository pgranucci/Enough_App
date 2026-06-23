import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetirementEditSheet } from '@/components/profile/retirement/retirement-edit-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RetirementOptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  value: T;
  options: { id: T; label: string }[];
  onClose: () => void;
  onSelect: (id: T) => void;
};

export function RetirementOptionSheet<T extends string>({
  visible,
  title,
  value,
  options,
  onClose,
  onSelect,
}: RetirementOptionSheetProps<T>) {
  const { colors } = useAppTheme();

  return (
    <RetirementEditSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                onSelect(option.id);
                onClose();
              }}
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? `${colors.tint}14` : colors.inputBackground,
                },
              ]}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selected ? colors.tint : colors.textSecondary },
                ]}>
                {selected ? (
                  <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                ) : null}
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionLabel}>
                {option.label}
              </ThemedText>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.tint} /> : null}
            </Pressable>
          );
        })}
      </View>
    </RetirementEditSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  optionLabel: {
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
});
