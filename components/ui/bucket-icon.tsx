import Svg, { Path } from 'react-native-svg';

type BucketIconProps = {
  size?: number;
  color: string;
};

/** Minimal outline bucket for tab and compact UI. */
export function BucketIcon({ size = 24, color }: BucketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 9.5 8.6 6h6.8L17 9.5M6 9.5h12v9.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V9.5Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
