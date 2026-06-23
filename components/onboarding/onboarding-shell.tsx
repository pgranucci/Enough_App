import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type OnboardingShellProps = {
  title: string;
  subtitle?: string;
  stepIndex: number;
  stepCount: number;
  canContinue: boolean;
  continueLabel?: string;
  isSubmitting?: boolean;
  onBack?: () => void;
  onContinue: () => void;
  children: ReactNode;
};

export function OnboardingShell({
  title,
  subtitle,
  stepIndex,
  stepCount,
  canContinue,
  continueLabel = 'Continue',
  isSubmitting = false,
  onBack,
  onContinue,
  children,
}: OnboardingShellProps) {
  const { colors } = useAppTheme();
  const progress = (stepIndex + 1) / stepCount;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            disabled={!onBack || isSubmitting}
            hitSlop={12}
            style={[styles.backButton, !onBack && styles.hidden, isSubmitting && styles.disabled]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={[styles.progressTrack, { backgroundColor: colors.track }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.tint, width: `${progress * 100}%` },
              ]}
            />
          </View>
          <ThemedText type="small" style={{ color: colors.textMuted, minWidth: 44 }}>
            {stepIndex + 1}/{stepCount}
          </ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.copy}>
            <ThemedText type="screenTitle">{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="default" style={{ color: colors.textMuted }}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {children}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.canvas, borderTopColor: colors.border },
          ]}>
          <Pressable
            onPress={onContinue}
            disabled={!canContinue || isSubmitting}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: colors.tint },
              (!canContinue || isSubmitting || pressed) && {
                opacity: canContinue && !isSubmitting ? 0.86 : 0.42,
              },
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.continueText}>{continueLabel}</ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  disabled: {
    opacity: 0.42,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.xxl,
  },
  copy: {
    gap: Spacing.md,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
