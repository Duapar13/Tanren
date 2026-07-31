import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { SplashView } from './SplashView';

// Long enough for SplashView's ninja-pop-in + kanji-split-to-wordmark animation (~1130ms) to
// always finish before the real screen swaps in, even when data/auth resolve almost instantly.
const MIN_SPLASH_MS = 1250;

export function AppShell() {
  const { loading: dataLoading } = useData();
  const { user, loading: authLoading } = useAuth();
  const loading = dataLoading || authLoading;
  const { colors } = useTheme();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(minTimer);
  }, []);

  // The Stack is only ever mounted once we know the real auth state, so
  // Stack.Protected's guards are correct from their very first render — no
  // live auth-state flip mid-mount, which is what could leave the router
  // stuck on a loading screen until the app was force-quit and reopened.
  if (loading || !minTimeElapsed) {
    return <SplashView />;
  }

  const needsOnboarding = !!user && !user.onboardingCompleted;

  return (
    <Stack
      // Keying on auth/onboarding state forces a full remount instead of a live
      // guard flip on login/logout/onboarding-complete — Stack.Protected
      // re-evaluating its guards on an already-mounted navigator was exactly the
      // fragile path that could leave login/signup (or the onboarding flow)
      // stuck after a successful response (the redirect racing React's own
      // state propagation). A fresh mount always gets the guards right first try.
      key={!user ? 'anon' : needsOnboarding ? 'onboarding' : 'authed'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !needsOnboarding}>
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
  );
}
