import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { AccountOwner } from '@/constants/financial-accounts';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountOwnerPickerProps = {
  selfLabel: string;
  partnerLabel: string;
  value: AccountOwner;
  onChange: (owner: AccountOwner) => void;
};

export function AccountOwnerPicker({
  selfLabel,
  partnerLabel,
  value,
  onChange,
}: AccountOwnerPickerProps) {
  const { colors } = useAppTheme();
  const options: { id: AccountOwner; label: string }[] = [
    { id: 'self', label: selfLabel },
    { id: 'partner', label: partnerLabel },
  ];

  return (
    <View style={styles.field}>
      <ThemedText type="captionMedium">Account Owner</ThemedText>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? `${colors.tint}14` : colors.surface,
                },
              ]}>
              <ThemedText type="defaultSemiBold" numberOfLines={2}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
