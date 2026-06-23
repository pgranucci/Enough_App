import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type LargeInputProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  helper?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  disabled?: boolean;
};

export function LargeInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  helper,
  autoCapitalize,
  disabled = false,
}: LargeInputProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="captionMedium">{label}</ThemedText> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
          },
          disabled && styles.disabled,
        ]}
      />
      {helper ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          {helper}
        </ThemedText>
      ) : null}
    </View>
  );
}

type OptionButtonProps<T extends string> = {
  label: string;
  description?: string;
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
  disabled?: boolean;
};

export function OptionButton<T extends string>({
  label,
  description,
  value,
  selected,
  onSelect,
  disabled = false,
}: OptionButtonProps<T>) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => onSelect(value)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? colors.tint : colors.border,
          backgroundColor: selected ? `${colors.tint}14` : colors.surface,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {description ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          {description}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export function OptionStack({ children }: { children: ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  input: {
    minHeight: 60,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    fontSize: 20,
  },
  stack: {
    gap: Spacing.md,
  },
  option: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.xs,
    minHeight: 64,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.5,
  },
});
