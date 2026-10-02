import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { OAuthButtons } from '../../components/OAuthButtons';
import { NingymaWordmark } from '../../components/NingymaWordmark';
import { NinjaMascot } from '../../components/NinjaMascot';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ThemedView style={{ flex: 1 }}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.accent + '33', colors.accent + '00']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', padding: Spacing.lg, paddingBottom: Spacing.xl }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md }}>
            <NinjaMascot size={132} reaction="proud" />
            <NingymaWordmark size={60} />
            <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
              {t.login.subtitle}
            </ThemedText>
          </View>

          <OAuthButtons />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
