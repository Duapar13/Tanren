import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { RANK_COLORS, SeasonMedal } from '../utils/ranking';

const BASE_SIZE = 100;
const R = 42;
const CENTER = BASE_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP_DEG = 8;
const SEGMENT_DEG = 60 - GAP_DEG;
const SEGMENT_LEN = (SEGMENT_DEG / 360) * CIRCUMFERENCE;

interface Props {
  medal: SeasonMedal;
  size?: number;
}

/**
 * Ring of 6 arcs (one per calendar month of the season, colored by the highest rank
 * reached by that point) around a diamond badge showing the season number. A first pass —
 * intended to move closer to a literal faceted-gem look once we have exact reference art.
 */
export function SeasonMedalBadge({ medal, size = BASE_SIZE }: Props) {
  const { colors } = useTheme();
  const scale = size / BASE_SIZE;
  const diamondSize = 46 * scale;
  const peakColor = RANK_COLORS[medal.peakRank];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${BASE_SIZE} ${BASE_SIZE}`}>
        <Circle cx={CENTER} cy={CENTER} r={R} stroke={colors.separator} strokeWidth={4} fill="none" opacity={0.4} />
        {medal.segments.map((rank, i) => {
          if (!rank) return null;
          const rotation = i * 60 - 90 + GAP_DEG / 2;
          return (
            <Circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={R}
              stroke={RANK_COLORS[rank]}
              strokeWidth={7}
              strokeDasharray={`${SEGMENT_LEN} ${CIRCUMFERENCE - SEGMENT_LEN}`}
              strokeLinecap="round"
              fill="none"
              rotation={rotation}
              origin={`${CENTER}, ${CENTER}`}
            />
          );
        })}
      </Svg>
      <View
        style={{
          position: 'absolute',
          width: diamondSize,
          height: diamondSize,
          borderRadius: 8 * scale,
          backgroundColor: peakColor + '33',
          borderWidth: 2,
          borderColor: peakColor,
          transform: [{ rotate: '45deg' }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <ThemedText variant="title2" weight="700" style={{ color: peakColor }}>
            {medal.seasonInfo.seasonNumber}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
