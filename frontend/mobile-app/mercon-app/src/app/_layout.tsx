import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  // Keep the native splash visible until the session is restored,
  // so the user never sees a flash of the wrong screen.
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        {/* Tab / hub screens switch instantly (standard tab behaviour — the
            floating nav stays put, no push-slide, no fade) */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="trips" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />
        <Stack.Screen name="notifications" options={{ animation: 'none' }} />
        <Stack.Screen name="documents" options={{ animation: 'none' }} />
        <Stack.Screen name="vehicle" options={{ animation: 'none' }} />
        <Stack.Screen name="settings" options={{ animation: 'none' }} />
        {/* Trip flow keeps the sequential push animation */}
        <Stack.Screen name="trip/pickup" />
        <Stack.Screen name="trip/arrived" />
        <Stack.Screen name="trip/delivery" />
        <Stack.Screen name="trip/completed" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
