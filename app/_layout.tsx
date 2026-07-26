import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PermanentMarker_400Regular,
} from '@expo-google-fonts/permanent-marker';
import { DB_NAME, migrateDb } from '../db/schema';
import { DataProvider } from '../context/DataContext';
import { AppShell } from '../components/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../hooks/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
          <DataProvider>
            <AppShell />
          </DataProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
