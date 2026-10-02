import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props {
  progress: number; // 0-1
  height?: number;
  tintColor?: string;
}

export function ProgressBar({ progress, height = 10, tintColor }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const tint = tintColor ?? colors.accent;

  return (
    <View
      style={{
        height,
        borderRadius: Radius.pill,
        backgroundColor: colors.fillSecondary,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          // Never collapse to an invisible sliver — a non-zero value should always read as "started".
          minWidth: clamped > 0 ? height : 0,
          height: '100%',
          borderRadius: Radius.pill,
          backgroundColor: tint,
        }}
      />
    </View>
  );
}
