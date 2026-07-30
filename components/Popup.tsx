import { Modal, Pressable, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

/** App-themed replacement for the native Alert — used for informational popups (e.g. badge details). */
export function Popup({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Spacing.xl,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.card,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: Spacing.lg,
            gap: Spacing.md,
          }}
        >
          <ThemedText variant="title3" weight="700" style={{ textAlign: 'center' }}>
            {title}
          </ThemedText>
          {children}
          <Pressable
            onPress={onClose}
            style={{
              paddingVertical: Spacing.md,
              borderRadius: Radius.md,
              backgroundColor: colors.accent,
              alignItems: 'center',
            }}
          >
            <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
              Fermer
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
