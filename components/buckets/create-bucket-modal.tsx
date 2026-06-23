import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { QuestionField } from '@/components/buckets/question-field';
import { ThemedText } from '@/components/themed-text';
import {
  CUSTOM_BUCKET_TEMPLATES,
  buildBucketFromTemplate,
  getDefaultAnswers,
  getEditAnswersForBucket,
  getEditTemplateForBucket,
  getTemplateById,
  isBucketQuestionAnswered,
  mergeEditedCustomBucket,
  type CustomBucketTemplate,
  type CustomBucketTemplateId,
} from '@/constants/custom-bucket-templates';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { BucketItem } from '@/constants/buckets';
import { formatCurrency, formatGoalTimeline } from '@/utils/format';

type CreateBucketModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate?: (bucket: BucketItem) => void | Promise<void>;
  onUpdate?: (bucket: BucketItem) => void | Promise<void>;
  editBucket?: BucketItem | null;
};

type Step = 'type' | 'questions' | 'review';

export function CreateBucketModal({
  visible,
  onClose,
  onCreate,
  onUpdate,
  editBucket = null,
}: CreateBucketModalProps) {
  const { colors } = useAppTheme();
  const isEditing = editBucket != null;

  const [step, setStep] = useState<Step>('type');
  const [selectedTemplateId, setSelectedTemplateId] = useState<CustomBucketTemplateId | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

  const preview = useMemo(() => {
    if (!template) return null;
    try {
      return template.buildBucket(answers, isEditing && editBucket ? editBucket.id : 'preview');
    } catch {
      return null;
    }
  }, [answers, editBucket, isEditing, template]);

  useEffect(() => {
    if (!visible) {
      setStep('type');
      setSelectedTemplateId(null);
      setAnswers({});
      return;
    }

    if (editBucket) {
      const editTemplate = getEditTemplateForBucket(editBucket);
      setSelectedTemplateId(editTemplate.id);
      setAnswers(getEditAnswersForBucket(editBucket, editTemplate));
      setStep('questions');
    }
  }, [visible, editBucket]);

  const selectTemplate = (next: CustomBucketTemplate) => {
    setSelectedTemplateId(next.id);
    setAnswers(getDefaultAnswers(next));
    setStep('questions');
  };

  const updateAnswer = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const handleSave = async () => {
    if (!template || !preview) return;

    if (isEditing && editBucket) {
      const built = buildBucketFromTemplate(template, answers, editBucket.id);
      const merged = mergeEditedCustomBucket(editBucket, built, template.id, answers);
      await onUpdate?.(merged);
    } else {
      const bucket = buildBucketFromTemplate(template, answers, `custom-${Date.now()}`);
      await onCreate?.(bucket);
    }

    onClose();
  };

  const handleBack = () => {
    if (isEditing) {
      onClose();
      return;
    }
    setStep(step === 'review' ? 'questions' : 'type');
  };

  const canContinue =
    step === 'questions' &&
    template?.questions.every((question) => {
      if (question.id === 'name') {
        return template.id !== 'custom' || Boolean(answers.name?.trim());
      }
      return isBucketQuestionAnswered(question, answers[question.id] ?? '');
    });

  const canCreate = preview && preview.target > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }, colors.shadow]}>
          <View style={[styles.handle, { backgroundColor: colors.track }]} />
          <View style={styles.header}>
            {step !== 'type' && (
              <Pressable onPress={handleBack} hitSlop={8} style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            )}
            <ThemedText type="sectionTitle" style={styles.headerTitle}>
              {step === 'type' && 'New bucket'}
              {step === 'questions' && (isEditing ? `Edit ${template?.name ?? 'goal'}` : template?.name)}
              {step === 'review' && (isEditing ? 'Review changes' : 'Review target')}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 'type' && (
              <>
                <ThemedText type="caption" style={{ color: colors.textMuted }}>
                  Choose a goal type. We will ask a few questions to calculate your target amount.
                  Assign accounts after creating the bucket to track progress.
                </ThemedText>
                <View style={styles.typeGrid}>
                  {CUSTOM_BUCKET_TEMPLATES.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => selectTemplate(item)}
                      style={({ pressed }) => [
                        styles.typeCard,
                        { backgroundColor: colors.surfaceMuted },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.typeIcon, { backgroundColor: `${item.accent}22` }]}>
                        <Ionicons name={item.icon} size={24} color={item.accent} />
                      </View>
                      <ThemedText type="captionMedium">{item.name}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textMuted }}>
                        {item.description}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {step === 'questions' && template && (
              <>
                <ThemedText type="caption" style={{ color: colors.textMuted }}>
                  {isEditing
                    ? 'Update your savings target and timeline below. Account assignments stay linked.'
                    : 'Answer below to set your savings target and timeline. Growth and completion come from accounts you assign after the bucket is created.'}
                </ThemedText>
                {template.questions.map((question) => (
                  <QuestionField
                    key={question.id}
                    question={question}
                    value={answers[question.id] ?? ''}
                    onChange={(value) => updateAnswer(question.id, value)}
                  />
                ))}
                {preview && preview.target > 0 && (
                  <View style={[styles.previewCard, { backgroundColor: colors.surfaceMuted }]}>
                    <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
                      Target amount
                    </ThemedText>
                    <ThemedText type="sectionTitle">
                      {formatCurrency(preview.target)}
                    </ThemedText>
                    {(preview.goalTargetMonth || preview.goalHorizonYears) && (
                      <ThemedText type="captionMedium">
                        Goal by {formatGoalTimeline(preview.goalTargetMonth, preview.goalHorizonYears)}
                      </ThemedText>
                    )}
                    <ThemedText type="small" style={{ color: colors.textMuted }}>
                      Assign accounts to this bucket to start tracking progress.
                    </ThemedText>
                  </View>
                )}
              </>
            )}

            {step === 'review' && preview && (
              <View style={[styles.reviewCard, { backgroundColor: colors.surfaceMuted }]}>
                <ThemedText type="eyebrow" style={{ color: colors.textMuted }}>
                  Bucket
                </ThemedText>
                <ThemedText type="sectionTitle">{preview.name}</ThemedText>
                <View style={styles.reviewRows}>
                  <ReviewRow label="Target" value={formatCurrency(preview.target)} />
                  {(preview.goalTargetMonth || preview.goalHorizonYears) && (
                    <ReviewRow
                      label="Goal date"
                      value={formatGoalTimeline(preview.goalTargetMonth, preview.goalHorizonYears)}
                    />
                  )}
                </View>
                <ThemedText type="small" style={{ color: colors.textMuted }}>
                  {isEditing
                    ? 'Saving updates your target and goal date. Progress still comes from assigned accounts.'
                    : 'After creating this bucket, expand it and assign accounts from Profile to calculate progress, contributions, and estimated completion — the same way Emergency and Slush work.'}
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {step !== 'type' && (
            <View style={styles.footer}>
              {step === 'questions' && (
                <Pressable
                  disabled={!canContinue}
                  onPress={() => setStep('review')}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.tint },
                    !canContinue && styles.disabled,
                  ]}>
                  <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
                </Pressable>
              )}
              {step === 'review' && (
                <Pressable
                  disabled={!canCreate}
                  onPress={handleSave}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.tint },
                    !canCreate && styles.disabled,
                  ]}>
                  <ThemedText style={styles.primaryButtonText}>
                    {isEditing ? 'Save changes' : 'Create bucket'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.reviewRow}>
      <ThemedText type="caption" style={{ color: colors.textMuted }}>
        {label}
      </ThemedText>
      <ThemedText type="captionMedium">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 33, 39, 0.35)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 28,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  typeGrid: {
    gap: Spacing.md,
  },
  typeCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  previewCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  reviewCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  reviewRows: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.45,
  },
});
