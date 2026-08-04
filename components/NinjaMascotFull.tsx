import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { GOLD_ACCENT } from '../constants/theme';
import { Eyes, Accessory, NinjaReaction } from './NinjaMascot';

interface Props {
  size?: number;
  reaction?: NinjaReaction;
}

/** Half-body "professor" pose of Gyma — head down to a gesturing torso, both arms raised
 * mid-explanation. Used where the mascot needs to feel like it's actively presenting (the
 * guided tour) rather than just watching from a small header badge. Shares its head, eyes and
 * per-tab accessory with the bust-only NinjaMascot so both stay visually the same character. */
export function NinjaMascotFull({ size = 120, reaction = 'default' }: Props) {
  const height = size * 1.45;
  return (
    <Svg width={size} height={height} viewBox="0 0 100 145">
      {/* Torso */}
      <Rect x={25} y={82} width={50} height={58} rx={20} fill="#111111" />
      {/* Sash */}
      <Rect x={17} y={106} width={66} height={10} rx={5} fill={GOLD_ACCENT} transform="rotate(-8 50 111)" />

      {/* Arms, raised out to the sides in a mid-explanation gesture — plain thick strokes from
          shoulder to hand so the endpoints are exact, no rotated-rect math to get wrong. Shoulders
          sit well below the hood (which ends at y=86); hands land outside the hood's x-range
          (16-84) so they never overlap the face. */}
      <Path d="M70 100 L89 91" stroke="#111111" strokeWidth={12} strokeLinecap="round" />
      <Circle cx={90} cy={90} r={6.5} fill="#111111" />
      <Path d="M30 100 L11 91" stroke="#111111" strokeWidth={12} strokeLinecap="round" />
      <Circle cx={10} cy={90} r={6.5} fill="#111111" />

      {/* Headband tails, flowing off the back of the head */}
      <Path d="M18 46 Q3 53 9 68 Q15 58 25 53 Z" fill={GOLD_ACCENT} />
      <Path d="M13 59 Q1 70 8 82 Q13 71 22 63 Z" fill={GOLD_ACCENT} />

      {/* Hood */}
      <Circle cx={50} cy={52} r={34} fill="#111111" />

      <Accessory reaction={reaction} />

      {/* Headband + knot */}
      <Rect x={16} y={39} width={68} height={13} rx={6.5} fill={GOLD_ACCENT} />
      <Circle cx={22} cy={45.5} r={4.2} fill="#8A631A" />

      {/* Eye slit */}
      <Path d="M27 56 Q50 46.5 73 56 L73 64 Q50 56.5 27 64 Z" fill="#F4F1EA" />

      <Eyes reaction={reaction} />
    </Svg>
  );
}
