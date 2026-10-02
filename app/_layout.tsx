import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { setAudioModeAsync } from 'expo-audio';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PermanentMarker_400Regular,
} from '@expo-google-fonts/permanent-marker';
import { DB_NAME, migrateDb } from '../db/schema';
import { DataProvider } from '../context/DataContext';
import { AuthProvider } from '../context/AuthContext';
import { SyncEngine } from '../components/SyncEngine';
import { AppShell } from '../components/AppShell';
import { GymaToastHost } from '../components/GymaToastHost';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../hooks/useTheme';
import { configurePurchases } from '../lib/purchases';
import { configureSentry } from '../lib/sentry';
import { loadPreferences } from '../lib/preferences';

SplashScreen.preventAutoHideAsync().catch(() => {});
loadPreferences();
configurePurchases();
configureSentry();
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

// Without this, a push arriving while the app is open is silently swallowed instead of
// showing a banner — makes testing (and real reminders received mid-session) invisible.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PermanentMarker_400Regular });
  const { scheme } = useTheme();

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // expo-updates only ever applies a downloaded OTA update on the NEXT cold launch by default —
  // the app boots off the currently-embedded bundle instantly, checks in the background, and a
  // freshly-downloaded update just sits there until the user happens to relaunch a second time.
  // Checking (and, if found, fetching + reloading) once right at startup means the very next
  // launch after a "va y" OTA push already lands on the new version — no manual double-relaunch.
  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Offline or update server unreachable — just continue on the current bundle.
      }
    })();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AuthProvider>
          <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
            <DataProvider>
              <SyncEngine />
              <AppShell />
              <GymaToastHost />
            </DataProvider>
          </SQLiteProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
