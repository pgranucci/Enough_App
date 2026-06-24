import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  formatPercentValue,
  parsePercentInput,
  sanitizePercentInputText,
} from '@/utils/format';

type ProfilePercentInputFieldProps = {
  label: string;
  infoMessage?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  editable?: boolean;
  showZeroValue?: boolean;
  /** `inline`: label and input on one row (Assumptions). `stacked`: label above input (default). */
  layout?: 'stacked' | 'inline';
};

export function ProfilePercentInputField({
  label,
  infoMessage,
  value,
  onChange,
  placeholder,
  editable = true,
  showZeroValue = false,
  layout = 'stacked',
}: ProfilePercentInputFieldProps) {
  const { colors } = useAppTheme();
  const displayValue = (nextValue: number) =>
    showZeroValue && Number.isFinite(nextValue) && nextValue === 0
      ? '0'
      : formatPercentValue(nextValue);
  const [text, setText] = useState(() => displayValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(displayValue(value));
    }
  }, [value, focused, showZeroValue]);

  const inputRow = (
    <View
      style={[
        styles.inputRow,
        layout === 'inline' && styles.inputRowInline,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
      ]}>
      <TextInput
        value={text}
        editable={editable}
        onChangeText={(raw) => {
          if (!editable) return;
          const sanitized = sanitizePercentInputText(raw);
          setText(sanitized);
          onChange(parsePercentInput(sanitized));
        }}
        onFocus={() => {
          if (!editable) return;
          setFocused(true);
        }}
        onBlur={() => {
          if (!editable) return;
          setFocused(false);
          setText(formatPercentValue(parsePercentInput(text)));
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          layout === 'inline' && styles.inputInline,
          { color: editable ? colors.text : colors.textMuted },
        ]}
      />
      <ThemedText style={[styles.affix, { color: colors.textMuted }]}>%</ThemedText>
    </View>
  );

  if (layout === 'inline') {
    return (
      <View style={styles.inlineRow}>
        <View style={styles.inlineLabelWrap}>
          <ProfileInfoLabel label={label} infoMessage={infoMessage} variant="captionMedium" />
        </View>
        {inputRow}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <ProfileInfoLabel label={label} infoMessage={infoMessage} />
      {inputRow}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inlineLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  inputRowInline: {
    width: 112,
    flexShrink: 0,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  affix: {
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  inputInline: {
    paddingVertical: Spacing.sm,
    textAlign: 'right',
  },
});
