import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { GOLD_ACCENT, GREEN_ACCENT } from '../constants/theme';

export type NinjaReaction = 'default' | 'focused' | 'excited' | 'proud' | 'content' | 'friendly';

interface Props {
  size?: number;
  reaction?: NinjaReaction;
}

export function Eyes({ reaction }: { reaction: NinjaReaction }) {
  switch (reaction) {
    // Séance — narrowed, determined squint with a short furrowed brow over each eye.
    case 'focused':
      return (
        <>
          <Path d="M33 52 L45 54" stroke="#111111" strokeWidth={2} strokeLinecap="round" />
          <Path d="M67 52 L55 54" stroke="#111111" strokeWidth={2} strokeLinecap="round" />
          <Ellipse cx={39} cy={59.5} rx={5} ry={3.4} fill="#111111" />
          <Ellipse cx={61} cy={59.5} rx={5} ry={3.4} fill="#111111" />
        </>
      );
    // Progression — wide, sparkling excited eyes.
    case 'excited':
      return (
        <>
          <Ellipse cx={39} cy={58.5} rx={5.6} ry={7} fill="#111111" />
          <Ellipse cx={61} cy={58.5} rx={5.6} ry={7} fill="#111111" />
          <Circle cx={41} cy={56} r={1.6} fill="#FFFFFF" />
          <Circle cx={63} cy={56} r={1.6} fill="#FFFFFF" />
          <Circle cx={37.5} cy={61} r={0.9} fill="#FFFFFF" />
          <Circle cx={59.5} cy={61} r={0.9} fill="#FFFFFF" />
        </>
      );
    // Rang — closed, beaming happy eyes (proud of the climb).
    case 'proud':
      return (
        <>
          <Path d="M33 60 Q39 54 45 60" stroke="#111111" strokeWidth={2.4} strokeLinecap="round" fill="none" />
          <Path d="M55 60 Q61 54 67 60" stroke="#111111" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </>
      );
    // Nutrition — relaxed, satisfied half-lidded eyes.
    case 'content':
      return (
        <>
          <Ellipse cx={39} cy={60} rx={5} ry={3.2} fill="#111111" />
          <Ellipse cx={61} cy={60} rx={5} ry={3.2} fill="#111111" />
          <Circle cx={40.5} cy={59} r={1.2} fill="#FFFFFF" />
          <Circle cx={62.5} cy={59} r={1.2} fill="#FFFFFF" />
        </>
      );
    // Profil — friendly wink.
    case 'friendly':
      return (
        <>
          <Ellipse cx={39} cy={59} rx={5} ry={6} fill="#111111" />
          <Circle cx={40.5} cy={57.2} r={1.5} fill="#FFFFFF" />
          <Path d="M56 59 Q61 62.5 66 59" stroke="#111111" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </>
      );
    default:
      return (
        <>
          <Ellipse cx={39} cy={59} rx={5} ry={6} fill="#111111" />
          <Ellipse cx={61} cy={59} rx={5} ry={6} fill="#111111" />
          <Circle cx={40.5} cy={57.2} r={1.5} fill="#FFFFFF" />
          <Circle cx={62.5} cy={57.2} r={1.5} fill="#FFFFFF" />
        </>
      );
  }
}

export function Accessory({ reaction }: { reaction: NinjaReaction }) {
  switch (reaction) {
    // Séance — a small dumbbell.
    case 'focused':
      return (
        <>
          <Rect x={70} y={76} width={16} height={3.2} rx={1.6} fill={GOLD_ACCENT} transform="rotate(-18 78 77.6)" />
          <Circle cx={68.5} cy={73.5} r={3.4} fill={GOLD_ACCENT} />
          <Circle cx={83.5} cy={80.5} r={3.4} fill={GOLD_ACCENT} />
        </>
      );
    // Progression — a little sparkle burst.
    case 'excited':
      return <Path d="M77 18 L79 23 L84 25 L79 27 L77 32 L75 27 L70 25 L75 23 Z" fill={GOLD_ACCENT} />;
    // Rang — a small shine near the knot.
    case 'proud':
      return <Path d="M76 20 L78 25 L83 26 L78 27 L76 32 L74 27 L69 26 L74 25 Z" fill={GOLD_ACCENT} />;
    // Nutrition — a little leaf.
    case 'content':
      return (
        <>
          <Path d="M70 18 Q84 18 82 32 Q68 32 70 18 Z" fill={GREEN_ACCENT} />
          <Path d="M71 30 L81 20" stroke="#1C4A2E" strokeWidth={1.2} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

/** Flat-vector ninja bust in the app's gold-on-black palette — Ningyma's mascot. Each tab gives
 * it a different `reaction` so it feels alive rather than a static logo pasted everywhere. */
export function NinjaMascot({ size = 96, reaction = 'default' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
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
