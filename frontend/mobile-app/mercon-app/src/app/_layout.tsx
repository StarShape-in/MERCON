import '../global.css';

import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { queryClient } from '@/lib/query-client';
import { DriverBottomNav } from '@/navigation/DriverBottomNav';
import { OperatorBottomNav } from '@/navigation/OperatorBottomNav';

import { LanguageProvider } from '@/lib/language-context';
import { DriverLiveTracking } from '@/lib/DriverLiveTracking';

SplashScreen.preventAutoHideAsync();

const TAB_ROUTES = [
  '/', '/trips', '/profile', '/notifications', '/documents', '/vehicle', '/settings', '/driver-charges',
  '/operator/trips', '/operator/drivers', '/operator/vehicles', '/operator/invoices',
  '/operator/more', '/operator/customers',
];

function RootNavigator() {
  const { isLoggedIn, isLoading, role } = useAuth();
  const pathname = usePathname();

  // Keep the native splash visible until the session is restored,
  // so the user never sees a flash of the wrong screen.
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../../assets/images/merconclosed.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  const showBottomNav = isLoggedIn && TAB_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F3F4F6' } }}>
        {/* Tab / hub screens switch instantly without animations */}
        {isLoggedIn && <Stack.Screen name="index" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="trips" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="profile" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="notifications" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="documents" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="vehicle" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="settings" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="driver-charges" />}
        {/* Trip flow keeps the sequential push animation */}
        {isLoggedIn && <Stack.Screen name="trip/details" />}
        {isLoggedIn && <Stack.Screen name="trip/pickup" />}
        {isLoggedIn && <Stack.Screen name="trip/navigate" />}
        {isLoggedIn && <Stack.Screen name="trip/stop" />}
        {isLoggedIn && <Stack.Screen name="trip/delivery" />}
        {isLoggedIn && <Stack.Screen name="trip/completed" />}
        {isLoggedIn && <Stack.Screen name="cargo-pod-photos" />}
        {/* Operator screens */}
        {isLoggedIn && <Stack.Screen name="operator/trips" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/drivers" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/vehicles" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/invoices" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/more" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/customers" options={{ animation: 'none' }} />}
        {isLoggedIn && <Stack.Screen name="operator/trip-details" />}
        {isLoggedIn && <Stack.Screen name="operator/create-trip" />}
        {isLoggedIn && <Stack.Screen name="operator/vehicle-renewals" />}
        {isLoggedIn && <Stack.Screen name="operator/driver-edit" />}
        {isLoggedIn && <Stack.Screen name="operator/vehicle-edit" />}
        {isLoggedIn && <Stack.Screen name="operator/customer-edit" />}

        {!isLoggedIn && <Stack.Screen name="login" />}
      </Stack>

      {isLoggedIn && role === 'Driver' && <DriverLiveTracking />}

      {showBottomNav && (
        <View style={styles.floatingNavOverlay} pointerEvents="box-none">
          {role === 'Operator' || role === 'Admin' ? <OperatorBottomNav /> : <DriverBottomNav />}
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <RootNavigator />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
  floatingNavOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
