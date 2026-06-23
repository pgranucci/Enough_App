import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { RetirementEditSheet } from '@/components/profile/retirement/retirement-edit-sheet';
import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ThemedText } from '@/components/themed-text';
import {
  newRetirementOtherIncomeStream,
  type OtherIncomeStreamAssignee,
  type RetirementOtherIncomeStream,
} from '@/constants/retirement';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatCurrency, formatWholeNumberDisplay, parseUsdWholeToNumber } from '@/utils/format';
import { parseAgeInput } from '@/utils/profile-age';

const OTHER_RETIREMENT_INCOME_INFO =
  'Use this for income after leaving full-time work — part-time work, consulting, rental income, annuities, and similar sources. Enter the gross monthly amount and the ages it is expected to start and end. Turn on Work in Retirement for wages that are subject to payroll tax.';

const WORK_IN_RETIREMENT_INFO =
  'W-2 wages and similar earned income are subject to FICA payroll tax (Social Security and Medicare), which lowers take-home pay and can increase how much you need from your portfolio.';

function incomeStreamCardTitle(stream: RetirementOtherIncomeStream): string {
  return stream.name.trim() || 'Income Stream';
}

function incomeStreamSummary(stream: RetirementOtherIncomeStream): string {
  const parts: string[] = [];
  if (stream.monthlyGross > 0) parts.push(`${formatCurrency(stream.monthlyGross)}/mo`);
  if (stream.startAge > 0 || stream.endAge > 0) {
    const start = stream.startAge > 0 ? String(stream.startAge) : '?';
    const end = stream.endAge > 0 ? String(stream.endAge) : '?';
    parts.push(`ages ${start}–${end}`);
  }
  if (stream.isWorkInRetirement) parts.push('Work income');
  return parts.length > 0 ? parts.join(' · ') : 'Tap to edit';
}

function IncomeStreamAssigneePicker({
  selfLabel,
  partnerLabel,
  value,
  onChange,
}: {
  selfLabel: string;
  partnerLabel: string;
  value: OtherIncomeStreamAssignee;
  onChange: (assignee: OtherIncomeStreamAssignee) => void;
}) {
  const { colors } = useAppTheme();
  const options: { id: OtherIncomeStreamAssignee; label: string }[] = [
    { id: 'self', label: selfLabel },
    { id: 'partner', label: partnerLabel },
  ];

  return (
    <View style={styles.field}>
      <ThemedText type="captionMedium">Assigned To</ThemedText>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.modeOption,
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

type RetirementOtherIncomeSheetProps = {
  visible: boolean;
  title: string;
  streams: RetirementOtherIncomeStream[];
  withPartner: boolean;
  assigneeFilter?: OtherIncomeStreamAssignee;
  selfLabel: string;
  partnerLabel: string;
  onClose: () => void;
  onChangeStreams: (streams: RetirementOtherIncomeStream[]) => void;
};

export function RetirementOtherIncomeSheet({
  visible,
  title,
  streams,
  withPartner,
  assigneeFilter,
  selfLabel,
  partnerLabel,
  onClose,
  onChangeStreams,
}: RetirementOtherIncomeSheetProps) {
  const { colors } = useAppTheme();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  const visibleStreams = assigneeFilter
    ? streams.filter((stream) => stream.assignedTo === assigneeFilter)
    : streams;

  const activeStream = activeStreamId
    ? streams.find((stream) => stream.id === activeStreamId) ?? null
    : null;

  useEffect(() => {
    if (!visible) {
      setActiveStreamId(null);
    }
  }, [visible]);

  const updateStream = (id: string, patch: Partial<RetirementOtherIncomeStream>) => {
    onChangeStreams(
      streams.map((stream) => (stream.id === id ? { ...stream, ...patch } : stream))
    );
  };

  const removeStream = (id: string) => {
    onChangeStreams(streams.filter((stream) => stream.id !== id));
    setActiveStreamId(null);
  };

  const addStream = () => {
    const stream = newRetirementOtherIncomeStream();
    if (assigneeFilter) {
      stream.assignedTo = assigneeFilter;
    }
    onChangeStreams([...streams, stream]);
    setActiveStreamId(stream.id);
  };

  return (
    <RetirementEditSheet
      visible={visible}
      title={activeStream ? incomeStreamCardTitle(activeStream) : title}
      onClose={() => {
        if (activeStreamId) {
          setActiveStreamId(null);
          return;
        }
        onClose();
      }}>
      {activeStream ? (
        <View style={styles.editBody}>
          <ProfileInputField
            label="Income Name"
            value={activeStream.name}
            onChange={(name) => updateStream(activeStream.id, { name })}
            placeholder="Rental property"
            autoCapitalize="words"
          />
          {withPartner && !assigneeFilter ? (
            <IncomeStreamAssigneePicker
              selfLabel={selfLabel}
              partnerLabel={partnerLabel}
              value={activeStream.assignedTo}
              onChange={(assignedTo) => updateStream(activeStream.id, { assignedTo })}
            />
          ) : null}
          <ProfileInputField
            label="Gross Monthly Amount"
            value={formatWholeNumberDisplay(activeStream.monthlyGross, { allowZero: true })}
            onChange={(text) =>
              updateStream(activeStream.id, { monthlyGross: parseUsdWholeToNumber(text) })
            }
            placeholder="1,500"
            suffix="$"
            keyboardType="number-pad"
          />
          <View style={styles.ageRow}>
            <View style={styles.ageField}>
              <ProfileInputField
                label="Start Age"
                value={activeStream.startAge > 0 ? String(activeStream.startAge) : ''}
                onChange={(text) =>
                  updateStream(activeStream.id, { startAge: parseAgeInput(text) })
                }
                placeholder="65"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.ageField}>
              <ProfileInputField
                label="End Age"
                value={activeStream.endAge > 0 ? String(activeStream.endAge) : ''}
                onChange={(text) => updateStream(activeStream.id, { endAge: parseAgeInput(text) })}
                placeholder="90"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleControl}>
              <ThemedText type="captionMedium">Is this work income?</ThemedText>
              <Pressable
                onPress={() => Alert.alert('Is this work income?', WORK_IN_RETIREMENT_INFO)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="About work income">
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              </Pressable>
              <Switch
                value={activeStream.isWorkInRetirement}
                onValueChange={(isWorkInRetirement) =>
                  updateStream(activeStream.id, { isWorkInRetirement })
                }
                trackColor={{ false: colors.track, true: `${colors.tint}66` }}
                thumbColor={activeStream.isWorkInRetirement ? colors.tint : colors.textSecondary}
              />
            </View>
          </View>
          <Pressable onPress={() => removeStream(activeStream.id)} hitSlop={8}>
            <ThemedText type="captionMedium" style={{ color: '#B45309' }}>
              Remove Income Stream
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listBody}>
          <ThemedText type="small" style={{ color: colors.textMuted }}>
            {OTHER_RETIREMENT_INCOME_INFO}
          </ThemedText>
          {visibleStreams.length === 0 ? (
            <ThemedText type="small" style={{ color: colors.textMuted }}>
              No income streams added yet.
            </ThemedText>
          ) : (
            visibleStreams.map((stream) => (
              <Pressable
                key={stream.id}
                onPress={() => setActiveStreamId(stream.id)}
                style={[
                  styles.streamRow,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                ]}>
                <View style={styles.streamText}>
                  <ThemedText type="defaultSemiBold">{incomeStreamCardTitle(stream)}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textMuted }}>
                    {incomeStreamSummary(stream)}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
          <Pressable
            onPress={addStream}
            style={({ pressed }) => [
              styles.addButton,
              { borderColor: colors.tint, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Ionicons name="add" size={18} color={colors.tint} />
            <ThemedText type="captionMedium" style={{ color: colors.tint }}>
              Add Income Stream
            </ThemedText>
          </Pressable>
        </View>
      )}
    </RetirementEditSheet>
  );
}

const styles = StyleSheet.create({
  listBody: {
    gap: Spacing.md,
  },
  editBody: {
    gap: Spacing.md,
  },
  streamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  streamText: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modeOption: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ageRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  ageField: {
    flex: 1,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  toggleControl: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: Spacing.sm,
  },
});
