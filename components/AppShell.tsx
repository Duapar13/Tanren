import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { SplashView } from './SplashView';

const MIN_SPLASH_MS = 500;
// Hard ceiling: no matter what else happens (slow DB init, a dropped
// state update), the splash overlay is guaranteed to disappear.
const MAX_SPLASH_MS = 3000;

export function AppShell() {
  const { loading: dataLoading } = useData();
  const { user, loading: authLoading } = useAuth();
  const loading = dataLoading || authLoading;
  const { colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    const maxTimer = setTimeout(() => setShowSplash(false), MAX_SPLASH_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) setShowSplash(false);
  }, [loading, minTimeElapsed]);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="exercise/[id]"
            options={{ title: 'Exercice' }}
          />
          <Stack.Screen
            name="food-search"
            options={{ title: 'Ajouter un aliment', presentation: 'modal' }}
          />
        </Stack.Protected>
      </Stack>
      {showSplash && (
        <SplashView style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />
      )}
    </>
  );
}
