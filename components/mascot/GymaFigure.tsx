import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export type NinjaReaction =
  | 'default'
  | 'focused'
  | 'excited'
  | 'proud'
  | 'content'
  | 'friendly'
  | 'sleepy'
  | 'happy';

export type GymaPose = 'bust' | 'idle' | 'lift' | 'victory' | 'rest';

// Fixed character palette: Gyma is an illustration, so it keeps the same colours in light and dark mode.
const INK = '#16171D';
const INK_LIGHT = '#343746';
const INK_DEEP = '#0A0B0E';
const CREAM = '#F7EFDD';
const GOLD_HI = '#FFD98A';
const GOLD = '#E9A23B';
const GOLD_LO = '#9E6812';
const EYE = '#13141A';
const BLUSH = '#F08A7A';
const SWEAT = '#7CC8F5';
const RIM = '#454A66'; // thin edge light so the black suit stays readable on dark backgrounds

const CLOSED_EYES: NinjaReaction[] = ['sleepy'];
const SMILING: NinjaReaction[] = ['happy', 'proud', 'excited', 'friendly'];
const BLUSHING: NinjaReaction[] = ['happy', 'proud', 'excited', 'friendly', 'content'];

function Gradients() {
  return (
    <Defs>
      <RadialGradient id="gHood" cx="0.35" cy="0.28" r="0.85">
        <Stop offset="0" stopColor="#4A4E60" />
        <Stop offset="0.45" stopColor="#24262F" />
        <Stop offset="1" stopColor="#0E0F14" />
      </RadialGradient>
      <LinearGradient id="gSuit" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#323546" />
        <Stop offset="1" stopColor="#101116" />
      </LinearGradient>
      <LinearGradient id="gPants" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#262833" />
        <Stop offset="1" stopColor="#0C0D11" />
      </LinearGradient>
      <LinearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={GOLD_HI} />
        <Stop offset="0.5" stopColor={GOLD} />
        <Stop offset="1" stopColor={GOLD_LO} />
      </LinearGradient>
      <LinearGradient id="gGoldH" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor={GOLD_LO} />
        <Stop offset="0.6" stopColor={GOLD} />
        <Stop offset="1" stopColor={GOLD_HI} />
      </LinearGradient>
      <LinearGradient id="gCream" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFF8EA" />
        <Stop offset="1" stopColor="#E2D2B0" />
      </LinearGradient>
      <LinearGradient id="gSteel" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E3E6EE" />
        <Stop offset="0.5" stopColor="#9AA0B0" />
        <Stop offset="1" stopColor="#5D6272" />
      </LinearGradient>
    </Defs>
  );
}

function Sparkle({ x, y, s = 1, color = GOLD_HI }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <Path
      d={`M${x} ${y - 9 * s} L${x + 2.6 * s} ${y - 2.6 * s} L${x + 9 * s} ${y} L${x + 2.6 * s} ${y + 2.6 * s} L${x} ${y + 9 * s} L${x - 2.6 * s} ${y + 2.6 * s} L${x - 9 * s} ${y} L${x - 2.6 * s} ${y - 2.6 * s} Z`}
      fill={color}
    />
  );
}

function Eye({ x, y, rx, ry, glints = 2 }: { x: number; y: number; rx: number; ry: number; glints?: number }) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={EYE} />
      <Circle cx={x + rx * 0.3} cy={y - ry * 0.36} r={rx * 0.36} fill="#FFFFFF" />
      {glints > 1 && <Circle cx={x - rx * 0.34} cy={y + ry * 0.4} r={rx * 0.17} fill="#FFFFFF" opacity={0.9} />}
      {glints > 2 && <Circle cx={x + rx * 0.45} cy={y + ry * 0.35} r={rx * 0.12} fill="#FFFFFF" opacity={0.8} />}
    </G>
  );
}

function Eyes({ reaction, blink }: { reaction: NinjaReaction; blink: boolean }) {
  const L = 78;
  const R = 122;
  const Y = 85;
  const arc = (x: number, up: boolean) => (
    <Path
      d={up ? `M${x - 9} ${Y + 4} Q${x} ${Y - 8} ${x + 9} ${Y + 4}` : `M${x - 9} ${Y - 1} Q${x} ${Y + 8} ${x + 9} ${Y - 1}`}
      stroke={EYE}
      strokeWidth={3.2}
      strokeLinecap="round"
      fill="none"
    />
  );

  if (CLOSED_EYES.includes(reaction) || (blink && !['proud', 'happy'].includes(reaction))) {
    return (
      <G>
        {arc(L, false)}
        {arc(R, false)}
      </G>
    );
  }

  switch (reaction) {
    case 'proud':
    case 'happy':
      return (
        <G>
          {arc(L, true)}
          {arc(R, true)}
        </G>
      );
    case 'focused':
      return (
        <G>
          <Eye x={L} y={Y + 1} rx={8} ry={6} />
          <Eye x={R} y={Y + 1} rx={8} ry={6} />
          <Path d="M66 76 L90 81" stroke={EYE} strokeWidth={3.4} strokeLinecap="round" />
          <Path d="M134 76 L110 81" stroke={EYE} strokeWidth={3.4} strokeLinecap="round" />
        </G>
      );
    case 'excited':
      return (
        <G>
          <Eye x={L} y={Y} rx={9.5} ry={11.5} glints={3} />
          <Eye x={R} y={Y} rx={9.5} ry={11.5} glints={3} />
        </G>
      );
    case 'content':
      return (
        <G>
          <Path d={`M${L - 8.5} ${Y} A8.5 7.5 0 0 0 ${L + 8.5} ${Y} Z`} fill={EYE} />
          <Path d={`M${R - 8.5} ${Y} A8.5 7.5 0 0 0 ${R + 8.5} ${Y} Z`} fill={EYE} />
          <Path d={`M${L - 9.5} ${Y} L${L + 9.5} ${Y}`} stroke={EYE} strokeWidth={2.6} strokeLinecap="round" />
          <Path d={`M${R - 9.5} ${Y} L${R + 9.5} ${Y}`} stroke={EYE} strokeWidth={2.6} strokeLinecap="round" />
          <Circle cx={L + 2.5} cy={Y + 3} r={2} fill="#FFFFFF" />
          <Circle cx={R + 2.5} cy={Y + 3} r={2} fill="#FFFFFF" />
        </G>
      );
    case 'friendly':
      return (
        <G>
          <Eye x={L} y={Y} rx={7.8} ry={10} />
          <Path d={`M${R - 9} ${Y + 1} Q${R} ${Y + 9} ${R + 9} ${Y + 1}`} stroke={EYE} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </G>
      );
    default:
      return (
        <G>
          <Eye x={L} y={Y} rx={7.8} ry={10} />
          <Eye x={R} y={Y} rx={7.8} ry={10} />
        </G>
      );
  }
}

function Tails({ lift = 0 }: { lift?: number }) {
  return (
    <G transform={lift ? `rotate(${-lift} 54 66)` : undefined}>
      <Path d="M54 66 C40 74 26 88 10 114 L24 112 L22 128 C38 108 52 94 66 80 Z" fill="url(#gGoldH)" />
      <Path d="M54 66 C42 76 30 90 18 108" stroke={GOLD_LO} strokeWidth={1.4} fill="none" opacity={0.55} />
      <Path d="M54 62 C40 56 24 54 4 62 L18 70 L6 84 C26 80 46 76 64 72 Z" fill="url(#gGoldH)" />
      <Path d="M54 63 C40 59 26 59 12 64" stroke={GOLD_LO} strokeWidth={1.4} fill="none" opacity={0.55} />
    </G>
  );
}

function Head({ reaction, blink }: { reaction: NinjaReaction; blink: boolean }) {
  const smiling = SMILING.includes(reaction);
  return (
    <G>
      <Ellipse cx={100} cy={80} rx={48} ry={46} fill="url(#gHood)" stroke={RIM} strokeWidth={1.4} />
      <Path d="M58 56 Q70 38 98 34" stroke="#6A6F86" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.55} />
      {/* mask over the lower face */}
      <Path d="M53 90 Q100 126 147 90 Q149 114 126 127 Q100 135 74 127 Q51 114 53 90 Z" fill="#0F1016" />
      <Path d="M70 114 Q100 130 130 114" stroke={INK_LIGHT} strokeWidth={1.6} fill="none" opacity={0.75} />
      {smiling && <Path d="M88 111 Q100 121 112 111" stroke="#565B72" strokeWidth={2.2} strokeLinecap="round" fill="none" />}
      {/* eye band */}
      <Path d="M54 72 Q100 58 146 72 L148 94 Q100 109 52 94 Z" fill="url(#gCream)" />
      <Path d="M54 72 Q100 58 146 72 L146 78 Q100 64 54 78 Z" fill="#000000" opacity={0.14} />
      <Path d="M52 94 Q100 109 148 94 L148 96 Q100 112 52 96 Z" fill="#000000" opacity={0.12} />
      {BLUSHING.includes(reaction) && (
        <G opacity={0.4}>
          <Ellipse cx={66} cy={96} rx={6.5} ry={3.6} fill={BLUSH} />
          <Ellipse cx={134} cy={96} rx={6.5} ry={3.6} fill={BLUSH} />
        </G>
      )}
      <Eyes reaction={reaction} blink={blink} />
      {/* headband */}
      <Path d="M52 58 Q100 33 148 58 Q151 67 148 75 Q100 50 52 75 Z" fill="url(#gGold)" stroke={GOLD_LO} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M55 56 Q100 33 145 56" stroke={GOLD_HI} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.75} />
      <Path d="M50 75 Q100 50 150 75 L150 78 Q100 53 50 78 Z" fill="#000000" opacity={0.18} />
      <Rect x={84} y={45} width={32} height={18} rx={4.5} fill="url(#gGold)" stroke={GOLD_LO} strokeWidth={1.4} />
      <Path d="M100 48 L107 54 L100 60 L93 54 Z" fill={INK} />
      <Path d="M100 49.6 L103.4 52.4" stroke={GOLD_HI} strokeWidth={1.2} strokeLinecap="round" />
      {/* knot */}
      <Circle cx={52} cy={66} r={8} fill="url(#gGold)" stroke={GOLD_LO} strokeWidth={1.2} />
      <Path d="M48 63 Q52 60 56 63" stroke={GOLD_HI} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Limb({ points, wrist = true }: { points: [number, number, number, number, number, number]; wrist?: boolean }) {
  const [x1, y1, x2, y2, x3, y3] = points;
  const d = `M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`;
  // wrist wrap: a short gold band along the last stretch of the forearm
  const wx1 = x2 + (x3 - x2) * 0.62;
  const wy1 = y2 + (y3 - y2) * 0.62;
  const wx2 = x2 + (x3 - x2) * 0.82;
  const wy2 = y2 + (y3 - y2) * 0.82;
  return (
    <G>
      <Path d={d} stroke={RIM} strokeWidth={21.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={INK} strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={INK_LIGHT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.4} transform="translate(-3 -2)" />
      {wrist && <Path d={`M${wx1} ${wy1} L${wx2} ${wy2}`} stroke="url(#gGold)" strokeWidth={19} strokeLinecap="butt" fill="none" />}
    </G>
  );
}

function Fist({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={9.5} fill="url(#gCream)" stroke="#CDBB95" strokeWidth={1} />
      <Path d={`M${x - 5} ${y - 4} L${x + 5} ${y - 4}`} stroke="#CDBB95" strokeWidth={1.2} strokeLinecap="round" />
      <Path d={`M${x - 5} ${y} L${x + 5} ${y}`} stroke="#CDBB95" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );
}

function Torso({ bust }: { bust: boolean }) {
  return (
    <G>
      <Path d="M58 128 Q100 112 142 128 Q154 168 148 208 Q100 220 52 208 Q46 168 58 128 Z" fill="url(#gSuit)" stroke={RIM} strokeWidth={1.4} />
      <Path d="M62 132 Q54 168 56 200" stroke="#6A6F86" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.4} />
      <Path d="M76 122 L100 170 L124 122 Q100 134 76 122 Z" fill="#0C0D11" />
      <Path d="M72 124 L102 178" stroke={INK_LIGHT} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />
      <Path d="M128 124 L98 178" stroke={INK_LIGHT} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />
      {!bust && (
        <G>
          <Rect x={50} y={192} width={100} height={18} rx={9} fill="url(#gGold)" />
          <Path d="M56 196 L144 196" stroke={GOLD_HI} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          <Path d="M114 208 L104 238 L114 233 L121 243 L126 210 Z" fill="url(#gGold)" stroke={GOLD_LO} strokeWidth={1} />
          <Circle cx={118} cy={201} r={8} fill="url(#gGold)" stroke={GOLD_LO} strokeWidth={1.2} />
        </G>
      )}
    </G>
  );
}

function Legs({ spread = 0, tilt = 0 }: { spread?: number; tilt?: number }) {
  const leg = (side: 'l' | 'r') => {
    const s = side === 'l' ? -1 : 1;
    const x0 = 100 + s * 3; // hip edge near the centre line
    const body = `M${x0} 204 Q${100 + s * 44} 236 ${100 + s * 40} 264 L${100 + s * 8} 264 Q${100 + s * 4} 236 ${x0} 204 Z`;
    return (
      <G transform={`translate(${s * spread} 0) rotate(${s * tilt} ${100 + s * 20} 204)`}>
        <Path d={body} fill="url(#gPants)" stroke={RIM} strokeWidth={1.4} />
        <Rect x={Math.min(100 + s * 8, 100 + s * 40)} y={248} width={32} height={10} rx={3} fill="url(#gGold)" />
        <Path d={`M${100 + s * 4} 262 Q${100 + s * 2} 279 ${100 + s * 20} 280 L${100 + s * 50} 280 Q${100 + s * 52} 267 ${100 + s * 42} 262 Z`} fill="#1B1D26" stroke={RIM} strokeWidth={1.2} />
        <Path d={`M${100 + s * 4} 277 L${100 + s * 50} 277 L${100 + s * 50} 281 Q${100 + s * 27} 285 ${100 + s * 4} 281 Z`} fill={CREAM} />
      </G>
    );
  };
  return (
    <G>
      {leg('l')}
      {leg('r')}
    </G>
  );
}

function Barbell() {
  const plate = (x: number, w: number, h: number) => (
    <G>
      <Rect x={x} y={149 - h / 2} width={w} height={h} rx={3} fill={INK} stroke={GOLD_LO} strokeWidth={1.2} />
      <Rect x={x + 1.5} y={149 - h / 2 + 3} width={2.4} height={h - 6} rx={1.2} fill={GOLD} opacity={0.9} />
    </G>
  );
  return (
    <G>
      <Rect x={8} y={146} width={184} height={6} rx={3} fill="url(#gSteel)" />
      {plate(10, 12, 50)}
      {plate(24, 8, 36)}
      {plate(178, 12, 50)}
      {plate(168, 8, 36)}
    </G>
  );
}

function Zzz() {
  const z = (x: number, y: number, s: number, o: number) => (
    <Path
      d={`M${x} ${y} L${x + 10 * s} ${y} L${x} ${y + 12 * s} L${x + 10 * s} ${y + 12 * s}`}
      stroke={GOLD}
      strokeWidth={2.8 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={o}
    />
  );
  return (
    <G>
      {z(150, 62, 0.8, 0.95)}
      {z(164, 40, 1.05, 0.8)}
      {z(180, 14, 1.3, 0.6)}
    </G>
  );
}

function Accessory({ reaction }: { reaction: NinjaReaction }) {
  if (reaction === 'excited' || reaction === 'proud' || reaction === 'happy') return <Sparkle x={160} y={40} s={1.3} />;
  if (reaction === 'focused')
    return (
      <Path d="M158 58 Q165 70 158 76 Q151 70 158 58 Z" fill={SWEAT} opacity={0.95} />
    );
  if (reaction === 'content')
    return (
      <G>
        <Path d="M150 30 Q172 30 168 52 Q146 52 150 30 Z" fill="#3E9E64" />
        <Path d="M152 49 L166 33" stroke="#1C4A2E" strokeWidth={1.6} strokeLinecap="round" />
      </G>
    );
  return null;
}

interface Props {
  pose?: GymaPose;
  reaction?: NinjaReaction;
  blink?: boolean;
  width?: number;
  height?: number;
}

/** Gyma, the Ningyma ninja — pure SVG so it stays crisp at any size and follows no theme (it is an
 * illustration). `bust` crops to head + shoulders for small spots; the other poses are full body. */
export function GymaFigure({ pose = 'idle', reaction = 'default', blink = false, width, height }: Props) {
  const bust = pose === 'bust';
  const viewBox = bust ? '0 16 200 176' : '0 0 200 300';
  const w = width ?? (bust ? 96 : 120);
  const h = height ?? (bust ? w * (176 / 200) : w * 1.5);

  let eyeReaction = reaction;
  if (pose === 'victory' && reaction === 'default') eyeReaction = 'happy';
  if (pose === 'lift' && reaction === 'default') eyeReaction = 'focused';
  if (pose === 'rest') eyeReaction = 'sleepy';

  const lifted = pose === 'victory' ? 14 : 0;
  const seated = pose === 'rest' ? 34 : 0;

  return (
    <Svg width={w} height={h} viewBox={viewBox}>
      <Gradients />

      {!bust && (
        <Ellipse cx={100} cy={284} rx={pose === 'victory' ? 40 : 58} ry={pose === 'victory' ? 5 : 7} fill="#000000" opacity={pose === 'victory' ? 0.18 : 0.28} />
      )}

      <G transform={lifted ? `translate(0 ${-lifted})` : seated ? `translate(0 ${seated})` : undefined}>
        <Tails lift={pose === 'victory' ? 12 : pose === 'rest' ? -6 : 0} />

        {pose === 'idle' && <Legs />}
        {pose === 'lift' && <Legs spread={7} />}
        {pose === 'victory' && <Legs spread={10} tilt={8} />}

        {pose === 'rest' && (
          <G>
            <Path d="M68 214 L40 244 L104 252" stroke={RIM} strokeWidth={26.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M132 214 L160 244 L96 252" stroke={RIM} strokeWidth={26.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M68 214 L40 244 L104 252" stroke="url(#gPants)" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M132 214 L160 244 L96 252" stroke="url(#gPants)" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Circle cx={104} cy={250} r={10} fill="#1B1D26" stroke={RIM} strokeWidth={1.2} />
            <Circle cx={96} cy={252} r={10} fill="#1B1D26" stroke={RIM} strokeWidth={1.2} />
            <Path d="M88 258 Q100 264 112 258" stroke={CREAM} strokeWidth={3} strokeLinecap="round" fill="none" />
          </G>
        )}

        <Torso bust={bust} />

        {bust && (
          <G>
            <Limb points={[64, 140, 44, 176, 46, 206]} wrist={false} />
            <Limb points={[136, 140, 156, 176, 154, 206]} wrist={false} />
          </G>
        )}

        {pose === 'idle' && (
          <G>
            <Limb points={[64, 140, 46, 172, 50, 202]} />
            <Fist x={50} y={206} />
            <Limb points={[136, 140, 154, 172, 150, 202]} />
            <Fist x={150} y={206} />
          </G>
        )}
        {pose === 'lift' && (
          <G>
            <Limb points={[64, 140, 38, 174, 58, 152]} wrist={false} />
            <Limb points={[136, 140, 162, 174, 142, 152]} wrist={false} />
            <Barbell />
            <Fist x={58} y={149} />
            <Fist x={142} y={149} />
          </G>
        )}
        {pose === 'victory' && (
          <G>
            <Limb points={[64, 138, 32, 112, 28, 74]} />
            <Fist x={28} y={68} />
            <Limb points={[136, 138, 168, 112, 172, 74]} />
            <Fist x={172} y={68} />
          </G>
        )}
        {pose === 'rest' && (
          <G>
            <Limb points={[64, 140, 44, 176, 52, 212]} />
            <Fist x={54} y={218} />
            <Limb points={[136, 140, 156, 176, 148, 212]} />
            <Fist x={146} y={218} />
          </G>
        )}

        <Head reaction={eyeReaction} blink={blink} />
        {(bust || pose === 'idle') && <Accessory reaction={reaction} />}
        {pose === 'lift' && <Accessory reaction="focused" />}
        {pose === 'victory' && (
          <G>
            <Sparkle x={26} y={34} s={1.2} />
            <Sparkle x={176} y={30} s={1.5} />
            <Sparkle x={160} y={8} s={0.9} color={GOLD} />
            <Circle cx={46} cy={20} r={3} fill={GOLD} />
            <Circle cx={186} cy={58} r={2.6} fill="#FFFFFF" opacity={0.85} />
            <Circle cx={12} cy={58} r={2.6} fill="#FFFFFF" opacity={0.85} />
          </G>
        )}
        {pose === 'rest' && <Zzz />}
      </G>
    </Svg>
  );
}
