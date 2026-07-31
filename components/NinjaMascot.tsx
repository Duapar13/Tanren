import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { GOLD_ACCENT } from '../constants/theme';

interface Props {
  size?: number;
}

/** Flat-vector ninja bust in the app's gold-on-black palette — Tanren's mascot. */
export function NinjaMascot({ size = 96 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Headband tails, flowing off the back of the head */}
      <Path d="M18 46 Q3 53 9 68 Q15 58 25 53 Z" fill={GOLD_ACCENT} />
      <Path d="M13 59 Q1 70 8 82 Q13 71 22 63 Z" fill={GOLD_ACCENT} />

      {/* Hood */}
      <Circle cx={50} cy={52} r={34} fill="#111111" />

      {/* Headband + knot */}
      <Rect x={16} y={39} width={68} height={13} rx={6.5} fill={GOLD_ACCENT} />
      <Circle cx={22} cy={45.5} r={4.2} fill="#8A631A" />

      {/* Eye slit */}
      <Path d="M27 56 Q50 46.5 73 56 L73 64 Q50 56.5 27 64 Z" fill="#F4F1EA" />

      {/* Eyes */}
      <Ellipse cx={39} cy={59} rx={5} ry={6} fill="#111111" />
      <Ellipse cx={61} cy={59} rx={5} ry={6} fill="#111111" />
      <Circle cx={40.5} cy={57.2} r={1.5} fill="#FFFFFF" />
      <Circle cx={62.5} cy={57.2} r={1.5} fill="#FFFFFF" />
    </Svg>
  );
}
