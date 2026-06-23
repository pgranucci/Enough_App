import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ProfileInputFieldProps = {
  label: string;
  infoMessage?: string;
  labelType?: 'captionMedium' | 'defaultSemiBold';
  labelInside?: boolean;
  embedded?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  suffix?: '$' | '%';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  trailingIcon?: ReactNode;
  supportingText?: string;
};

export function ProfileInputField({
  label,
  infoMessage,
  labelType = 'captionMedium',
  labelInside = false,
  embedded = false,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  suffix,
  autoCapitalize = 'none',
  trailingIcon,
  supportingText,
}: ProfileInputFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      {infoMessage ? (
        <ProfileInfoLabel label={label} infoMessage={infoMessage} />
      ) : !labelInside ? (
        <ThemedText type={labelType}>{label}</ThemedText>
      ) : null}
      <View
        style={[
          styles.inputRow,
          labelInside && !embedded && styles.inputStack,
          embedded && styles.embeddedInputRow,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
          embedded && { backgroundColor: 'transparent', borderColor: 'transparent' },
        ]}>
        {labelInside ? (
          <ThemedText
            type="caption"
            style={[embedded && styles.embeddedLabel, { color: colors.textMuted }]}>
            {label}
          </ThemedText>
        ) : null}
        <View style={[styles.valueContainer, embedded && styles.embeddedValue]}>
          <View style={styles.valueRow}>
            {suffix === '$' && (
              <ThemedText style={[styles.affix, { color: colors.textMuted }]}>$</ThemedText>
            )}
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              style={[styles.input, labelInside && styles.inputInsideLabel, { color: colors.text }]}
            />
            {suffix === '%' ? (
              <ThemedText style={[styles.affix, { color: colors.textMuted }]}>%</ThemedText>
            ) : null}
            {trailingIcon}
          </View>
          {supportingText ? (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              {supportingText}
            </ThemedText>
          ) : null}
        </View>
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
  inputStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  embeddedInputRow: {
    borderWidth: 0,
    borderRadius: 0,
    minHeight: 64,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  embeddedLabel: {
    flex: 1,
  },
  embeddedValue: {
    flex: 1,
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  valueContainer: {
    flex: 1,
  },
  affix: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  inputInsideLabel: {
    paddingVertical: 0,
  },
});
