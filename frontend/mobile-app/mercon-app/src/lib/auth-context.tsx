/**
 * Auth state for the driver app.
 * - Token + driver profile persisted in SecureStore
 * - Exposes signIn / signOut and an isLoggedIn flag used by the
 *   Stack.Protected guards in src/app/_layout.tsx
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, TOKEN_KEY } from './api';

const DRIVER_KEY = 'mercon_driver';

export interface Driver {
  id: string;
  name: string;
  ref_id: string;
  status: string;
}

interface AuthContextValue {
  driver: Driver | null;
  isLoggedIn: boolean;
  isLoading: boolean; // true while restoring the session on app start
  signIn: (phone_primary: string, license_number: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const [token, rawDriver] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(DRIVER_KEY),
        ]);
        if (token && rawDriver) {
          setDriver(JSON.parse(rawDriver));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (phone_primary: string, license_number: string) => {
    const { data } = await api.post('/mobile/auth/login', {
      phone_primary,
      license_number,
    });
    const { token, driver: driverData } = data.data;
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(driverData)),
    ]);
    setDriver(driverData);
  };

  const signOut = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(DRIVER_KEY),
    ]);
    setDriver(null);
  };

  return (
    <AuthContext.Provider
      value={{ driver, isLoggedIn: driver !== null, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
