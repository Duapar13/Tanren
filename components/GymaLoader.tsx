import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NinjaMascot } from './NinjaMascot';
import { ThemedText } from './ThemedText';
import { Spacing } from '../constants/theme';

interface Props {
  size?: number;
  label?: string;
}

/** Loading indicator: Gyma hops on the spot instead of a generic spinner. */
export function GymaLoader({ size = 72, label }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 950);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={{ alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md }}>
      <NinjaMascot size={size} reaction="excited" animated hopKey={tick} />
      {label ? (
        <ThemedText variant="footnote" color="secondary">
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}
