import { Modal, Pressable, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

/** App-themed replacement for the native Alert — used for informational popups (e.g. season details). */
export function Popup({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

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
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: Spacing.xl,
            gap: Spacing.lg,
          }}
        >
          <ThemedText variant="title3" weight="700" style={{ textAlign: 'center' }}>
            {title}
          </ThemedText>
          {children}
          <Pressable
            onPress={onClose}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              borderRadius: Radius.md,
              backgroundColor: colors.accent,
              alignItems: 'center',
            }}
          >
            <ThemedText variant="subhead" weight="700" style={{ color: colors.onAccent }}>
              {t.common.close}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
