import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { showMessage } from '@/utils/show-message';

type ProfileInfoLabelProps = {
  label: string;
  infoMessage?: string;
  variant?: 'captionMedium' | 'caption';
};

export function ProfileInfoLabel({
  label,
  infoMessage,
  variant = 'captionMedium',
}: ProfileInfoLabelProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <ThemedText
        type={variant}
        style={[
          styles.label,
          variant === 'caption' ? { color: colors.textMuted } : undefined,
        ]}>
        {label}
      </ThemedText>
      {infoMessage ? (
        <Pressable
          onPress={() => showMessage(label, infoMessage)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`About ${label}`}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    alignSelf: 'stretch',
  },
  label: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});
