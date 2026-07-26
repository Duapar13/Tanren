import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';

interface Props {
  progress: number; // 0-1
  height?: number;
  tintColor?: string;
}

export function ProgressBar({ progress, height = 8, tintColor }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

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
          height: '100%',
          borderRadius: Radius.pill,
          backgroundColor: tintColor ?? colors.accent,
        }}
      />
    </View>
  );
}
