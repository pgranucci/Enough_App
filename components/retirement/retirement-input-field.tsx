import { StyleSheet, TextInput, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ThemedText } from '@/components/themed-text';
import type { RetirementFieldConfig } from '@/constants/retirement';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RetirementInputFieldProps = {
  field: RetirementFieldConfig;
  value: string;
  onChange: (value: string) => void;
};

export function RetirementInputField({ field, value, onChange }: RetirementInputFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      <ProfileInfoLabel label={field.label} infoMessage={field.infoMessage} variant="captionMedium" />
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}>
        {field.suffix === '$' && (
          <ThemedText style={[styles.affix, { color: colors.textMuted }]}>$</ThemedText>
        )}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, { color: colors.text }]}
        />
        {field.suffix === '%' && (
          <ThemedText style={[styles.affix, { color: colors.textMuted }]}>%</ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  affix: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
});
