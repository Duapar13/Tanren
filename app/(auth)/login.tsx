import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { OAuthButtons } from '../../components/OAuthButtons';
import { TanrenWordmark } from '../../components/TanrenWordmark';
import { Spacing } from '../../constants/theme';

export default function LoginScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl }}>
          <View style={{ alignItems: 'center', gap: Spacing.xs }}>
            <TanrenWordmark size={52} />
            <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
              Connecte-toi pour continuer
            </ThemedText>
          </View>

          <OAuthButtons />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
