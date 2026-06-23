import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ProfileCollapsibleSectionProps = {
  title: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  materialCommunityIcon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  navigationCard?: boolean;
  /** When false, section starts collapsed. */
  defaultOpen?: boolean;
  children: ReactNode;
};

export function ProfileCollapsibleSection({
  title,
  icon,
  materialCommunityIcon,
  navigationCard = false,
  defaultOpen = true,
  children,
}: ProfileCollapsibleSectionProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <Card style={styles.card} padding="md">
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          navigationCard && styles.navigationHeader,
          pressed && styles.headerPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${title}`}>
        {materialCommunityIcon ? (
          <MaterialCommunityIcons name={materialCommunityIcon} size={22} color={colors.textMuted} />
        ) : icon ? (
          <Ionicons name={icon} size={22} color={colors.textMuted} />
        ) : null}
        <ThemedText type="sectionTitle" style={styles.title}>
          {title}
        </ThemedText>
        <Ionicons
          name={navigationCard ? 'chevron-forward' : open ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  navigationHeader: {
    minHeight: 44,
  },
  headerPressed: {
    opacity: 0.75,
  },
  title: {
    flex: 1,
  },
  body: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
});
