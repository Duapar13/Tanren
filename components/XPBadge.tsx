import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';

interface Props {
  points: number;
  size?: 'sm' | 'md';
}

/** Small lightning-bolt XP chip — replaces the plain "+N pts" text wherever a point gain or
 * loss is shown, so it reads as a game stat rather than a raw number. */
export function XPBadge({ points, size = 'md' }: Props) {
  const { colors } = useTheme();
  const positive = points >= 0;
  const tint = positive ? colors.positive : colors.negative;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        alignSelf: 'flex-start',
        backgroundColor: tint + '1F',
        borderRadius: 999,
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 3 : 5,
      }}
    >
      <Ionicons name="flash" size={iconSize} color={tint} />
      <ThemedText variant={size === 'sm' ? 'caption' : 'footnote'} weight="700" style={{ color: tint }}>
        {positive ? '+' : ''}
        {points}
      </ThemedText>
    </View>
  );
}
