import { StyleSheet, View } from 'react-native';

import { ProfileInfoLabel } from '@/components/profile/profile-info-label';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ProfileResultRowProps = {
  label: string;
  infoMessage?: string;
  value: string;
  highlight?: boolean;
};

export function ProfileResultRow({ label, infoMessage, value, highlight }: ProfileResultRowProps) {
  return (
    <View style={styles.row}>
      <ProfileInfoLabel label={label} infoMessage={infoMessage} variant="caption" />
      <ThemedText type={highlight ? 'captionMedium' : 'caption'} style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.xs,
  },
  value: {
    paddingLeft: Spacing.xs,
  },
});
