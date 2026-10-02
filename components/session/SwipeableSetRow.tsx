import { useRef } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius } from '../../constants/theme';
import { haptics } from '../../lib/haptics';

const TRIGGER = 88;

interface Props {
  children: React.ReactNode;
  /** Swipe left past the threshold. */
  onDelete: () => void;
  /** Swipe right past the threshold. */
  onEdit: () => void;
}

/** A row that reveals a delete action when dragged left and an edit action when dragged right.
 * PanResponder only claims clearly horizontal drags, so vertical scrolling and taps on the row's
 * own content keep working. */
export function SwipeableSetRow({ children, onDelete, onEdit }: Props) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const handlers = useRef({ onDelete, onEdit });
  handlers.current = { onDelete, onEdit };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => translateX.setValue(Math.max(-140, Math.min(140, g.dx))),
      onPanResponderRelease: (_, g) => {
        const settle = () =>
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        if (g.dx <= -TRIGGER) {
          haptics.tap();
          Animated.timing(translateX, { toValue: -400, duration: 140, useNativeDriver: true }).start(() => {
            handlers.current.onDelete();
            translateX.setValue(0);
          });
        } else if (g.dx >= TRIGGER) {
          haptics.tap();
          handlers.current.onEdit();
          settle();
        } else {
          settle();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;

  const deleteOpacity = translateX.interpolate({ inputRange: [-TRIGGER, -20, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' });
  const editOpacity = translateX.interpolate({ inputRange: [0, 20, TRIGGER], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });

  return (
    <View style={{ borderRadius: Radius.md, overflow: 'hidden' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '50%',
          backgroundColor: colors.accentSoft,
          justifyContent: 'center',
          paddingLeft: 20,
          opacity: editOpacity,
        }}
      >
        <Ionicons name="pencil" size={20} color={colors.accent} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '50%',
          backgroundColor: colors.negative + '26',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 20,
          opacity: deleteOpacity,
        }}
      >
        <Ionicons name="trash" size={20} color={colors.negative} />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }], backgroundColor: colors.card }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
