import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PLANNING_MODE_OPTIONS, type PlanningMode } from '@/constants/profile';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type PlanningModePickerProps = {
  value: PlanningMode;
  onChange: (mode: PlanningMode) => void;
};

export function PlanningModePicker({ value, onChange }: PlanningModePickerProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selectedLabel = PLANNING_MODE_OPTIONS.find((option) => option.id === value)?.label ?? value;

  const selectMode = (mode: PlanningMode) => {
    onChange(mode);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Planning Status"
        style={({ pressed }) => [
          styles.selector,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.selectorText}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>
            Planning Status
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }} numberOfLines={1}>
            {selectedLabel}
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }, colors.shadow]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="sectionTitle">Planning Status</ThemedText>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.options}>
            {PLANNING_MODE_OPTIONS.map((option) => {
              const selected = option.id === value;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => selectMode(option.id)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected ? `${colors.tint}14` : colors.inputBackground,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                  ]}>
                  <ThemedText type={selected ? 'defaultSemiBold' : 'default'} style={{ color: colors.text }}>
                    {option.label}
                  </ThemedText>
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.tint} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 76,
    gap: Spacing.md,
  },
  selectorText: {
    flex: 1,
    gap: Spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 33, 39, 0.35)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
