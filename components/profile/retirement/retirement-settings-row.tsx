import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type RetirementSettingsRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress: () => void;
  showDivider?: boolean;
};

export function RetirementSettingsRow({
  icon,
  label,
  value,
  onPress,
  showDivider = true,
}: RetirementSettingsRowProps) {
  const { colors } = useAppTheme();

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}>
        <View style={[styles.iconBadge, { backgroundColor: `${colors.tint}22` }]}>
          <Ionicons name={icon} size={18} color={colors.tint} />
        </View>
        <View style={styles.textBlock}>
          <ThemedText type="small" style={{ color: colors.textMuted }}>
            {label}
          </ThemedText>
          <ThemedText type="defaultSemiBold" numberOfLines={2}>
            {value}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
    </>
  );
}

export function RetirementSettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="captionMedium" style={{ color: colors.textMuted }}>
          {title}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.listCard,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowPressed: {
    opacity: 0.8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
});
