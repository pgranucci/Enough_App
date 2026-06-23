import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { US_STATES, getStateName, type USStateCode } from '@/constants/us-states';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type StatePickerProps = {
  value: USStateCode;
  onChange: (state: USStateCode) => void;
  label?: string;
  modalTitle?: string;
};

type StatePickerModalProps = {
  visible: boolean;
  value: USStateCode;
  onChange: (state: USStateCode) => void;
  onClose: () => void;
  modalTitle?: string;
};

export function StatePickerModal({
  visible,
  value,
  onChange,
  onClose,
  modalTitle = 'Select state',
}: StatePickerModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }, colors.shadow]}>
        <View style={styles.sheetHeader}>
          <ThemedText type="sectionTitle">{modalTitle}</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          {US_STATES.map((state) => {
            const selected = state.code === value;

            return (
              <Pressable
                key={state.code}
                onPress={() => {
                  onChange(state.code);
                  onClose();
                }}
                style={[styles.option, selected && { backgroundColor: `${colors.tint}14` }]}>
                <ThemedText type={selected ? 'captionMedium' : 'caption'}>{state.name}</ThemedText>
                {selected && <Ionicons name="checkmark" size={20} color={colors.tint} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function StatePicker({
  value,
  onChange,
  label,
  modalTitle = 'Select state',
}: StatePickerProps) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="captionMedium">{label}</ThemedText> : null}
      <Pressable
        onPress={() => setVisible(true)}
        style={[
          styles.selector,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}>
        <ThemedText type="caption">{getStateName(value)}</ThemedText>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <StatePickerModal
        visible={visible}
        value={value}
        onChange={onChange}
        onClose={() => setVisible(false)}
        modalTitle={modalTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 33, 39, 0.35)',
  },
  sheet: {
    maxHeight: '70%',
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
});
