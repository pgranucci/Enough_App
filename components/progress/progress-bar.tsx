import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';

type ProgressBarProps = {
  progress: number;
  color: string;
  trackColor: string;
  height?: number;
};

export function ProgressBar({
  progress,
  color,
  trackColor,
  height = 6,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: Radius.full },
      ]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clamped * 100}%`,
            height,
            borderRadius: Radius.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
