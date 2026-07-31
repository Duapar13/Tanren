import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { OAuthButtons } from '../../components/OAuthButtons';
import { NingymaWordmark } from '../../components/NingymaWordmark';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl }}>
          <View style={{ alignItems: 'center', gap: Spacing.xs }}>
            <NingymaWordmark size={52} />
            <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
              {t.login.subtitle}
            </ThemedText>
          </View>

          <OAuthButtons />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
