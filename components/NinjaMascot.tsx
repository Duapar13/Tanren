import { View } from 'react-native';
import { Gyma } from './mascot/Gyma';
import type { NinjaReaction } from './mascot/GymaFigure';

export type { NinjaReaction };

interface Props {
  size?: number;
  reaction?: NinjaReaction;
  /** Defaults to on for sizes where breathing/blinking is actually visible. */
  animated?: boolean;
}

/** Gyma, head and shoulders — the compact mascot used in headers and small spots. Each screen gives
 * it a different `reaction` so it feels alive rather than a static logo. See components/mascot for
 * the full-body poses. */
export function NinjaMascot({ size = 96, reaction = 'default', animated }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Gyma pose="bust" reaction={reaction} size={size} animated={animated ?? size >= 64} />
    </View>
  );
}
