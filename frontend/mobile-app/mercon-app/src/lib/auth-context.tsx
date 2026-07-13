/**
 * Auth state for the MERCON mobile app (shared by drivers AND operators).
 * - Token + role + profile persisted in SecureStore
 * - Two sign-in paths that reuse the existing backend endpoints:
 *     driver   → POST /mobile/auth/login  (phone + license)
 *     operator → POST /auth/login         (username + password)
 * - Exposes `role` so the router can send each user to the right home screen
 *   (see src/app/index.tsx and the Stack.Protected guards in src/app/_layout.tsx).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, TOKEN_KEY } from './api';

const SESSION_KEY = 'mercon_session';

export type Role = 'Driver' | 'Operator' | 'Admin';

/** Unified profile — driver fields and operator fields are both optional. */
export interface Profile {
  id: string;
  name: string;
  // Driver-specific
  ref_id?: string;
  status?: string;
  // Operator/Admin-specific
  username?: string;
}

interface Session {
  role: Role;
  profile: Profile;
}

interface AuthContextValue {
  role: Role | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  isLoading: boolean; // true while restoring the session on app start
  signInDriver: (phone_primary: string, license_number: string) => Promise<void>;
  signInOperator: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const [token, rawSession] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(SESSION_KEY),
        ]);
        if (token && rawSession) {
          setSession(JSON.parse(rawSession));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = async (token: string, next: Session) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next)),
    ]);
    setSession(next);
  };

  const signInDriver = async (phone_primary: string, license_number: string) => {
    const { data } = await api.post('/mobile/auth/login', { phone_primary, license_number });
    const { token, driver } = data.data;
    await persist(token, { role: 'Driver', profile: driver });
  };

  const signInOperator = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    const { token, user } = data.data;
    await persist(token, {
      role: user.role,
      profile: { id: user.id, name: user.name, username: user.username },
    });
  };

  const signOut = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(SESSION_KEY),
    ]);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        role: session?.role ?? null,
        profile: session?.profile ?? null,
        isLoggedIn: session !== null,
        isLoading,
        signInDriver,
        signInOperator,
        signOut,
      }}
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
