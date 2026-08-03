import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../hooks/useTheme';
import { configurePurchases } from '../lib/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});
configurePurchases();
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
            </DataProvider>
          </SQLiteProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
