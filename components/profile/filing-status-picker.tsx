import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FILING_STATUS_OPTIONS, type FilingStatus } from '@/constants/profile';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilingStatusIconName = ComponentProps<typeof Ionicons>['name'];

type FilingStatusPickerProps = {
  value: FilingStatus;
  onChange: (status: FilingStatus) => void;
  label?: string;
  /** When set, label uses the same icon + title style as Income & Taxes section headers. */
  headerIcon?: FilingStatusIconName;
};

function FilingSectionHeader({ title, icon }: { title: string; icon: FilingStatusIconName }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${colors.tint}22` }]}>
        <Ionicons name={icon} size={18} color={colors.tint} />
      </View>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
    </View>
  );
}

function FilingStatusOptionList({ value, onChange }: FilingStatusPickerProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.options}>
      {FILING_STATUS_OPTIONS.map((option) => {
        const selected = option.id === value;

        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.option,
              {
                backgroundColor: selected ? colors.tint : colors.inputBackground,
                borderColor: selected ? colors.tint : colors.border,
              },
            ]}>
            <ThemedText
              type="caption"
              style={{ color: selected ? '#fff' : colors.textMuted }}
              numberOfLines={2}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Profile: collapsed summary row with chevron; expands to change filing status. */
export function FilingStatusExpandable({
  value,
  onChange,
  label: fieldLabel = 'Tax Filing Status',
  headerIcon,
}: FilingStatusPickerProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selectedLabel = FILING_STATUS_OPTIONS.find((o) => o.id === value)?.label ?? value;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const handleChange = (status: FilingStatus) => {
    onChange(status);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      {headerIcon ? (
        <FilingSectionHeader title={fieldLabel} icon={headerIcon} />
      ) : (
        <ThemedText type="captionMedium">{fieldLabel}</ThemedText>
      )}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.expandTrigger,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText type="defaultSemiBold" style={[styles.expandLabel, { color: colors.text }]}>
          {selectedLabel}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />
      </Pressable>
      {open ? <FilingStatusOptionList value={value} onChange={handleChange} /> : null}
    </View>
  );
}

/** Onboarding and forms: full option list with label. */
export function FilingStatusPicker({ value, onChange }: FilingStatusPickerProps) {
  return (
    <View style={styles.field}>
      <ThemedText type="captionMedium">Filing Status</ThemedText>
      <FilingStatusOptionList value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  expandLabel: {
    flex: 1,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
