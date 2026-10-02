import { Gyma } from './mascot/Gyma';
import type { NinjaReaction } from './mascot/GymaFigure';

interface Props {
  size?: number;
  reaction?: NinjaReaction;
}

/** Full-body standing Gyma (the guided tour's presenter). */
export function NinjaMascotFull({ size = 120, reaction = 'default' }: Props) {
  return <Gyma pose="idle" reaction={reaction} size={size} animated />;
}
