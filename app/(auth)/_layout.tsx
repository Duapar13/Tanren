import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();

  // Redirect from an effect, not right after signup()/login() resolves — setUser()'s
  // state update (and Stack.Protected re-evaluating which group is active) hasn't
  // necessarily committed yet at that point, so an immediate router.replace('/(tabs)')
  // can race it and silently no-op, leaving the user stuck on the auth screen until they
  // navigate manually or restart the app. An effect on `user` only runs after the render
  // where Stack.Protected has already unprotected (tabs), so the target route exists.
  useEffect(() => {
    if (user) router.replace('/(tabs)');
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
