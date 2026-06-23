import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnoughScoreTabButton } from '@/components/navigation/enough-score-tab-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const visibleRoutes = state.routes.filter((route) => route.name !== 'index');
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);
  const activeRoute = state.routes[state.index];
  const isEnoughScoreActive = activeRoute.name === 'index';

  const renderTab = (route: (typeof visibleRoutes)[number]) => {
    const routeIndex = state.routes.findIndex((entry) => entry.key === route.key);
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const isFocused = state.index === routeIndex;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    const tint = isFocused ? colors.tint : colors.textSecondary;

    return (
      <PlatformPressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={styles.tab}>
        {options.tabBarIcon?.({ focused: isFocused, color: tint, size: 24 })}
        <ThemedText type="small" style={[styles.tabLabel, { color: tint }]}>
          {label}
        </ThemedText>
      </PlatformPressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8),
        },
      ]}>
      <View style={styles.row}>
        {leftRoutes.map(renderTab)}
        <EnoughScoreTabButton
          active={isEnoughScoreActive}
          onPress={() => navigation.navigate('index')}
        />
        {rightRoutes.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#1C2127',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: Platform.OS === 'ios' ? 52 : 48,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: Platform.OS === 'ios' ? 0 : 0,
  },
});
