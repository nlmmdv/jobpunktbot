import React, { createContext, useContext, useEffect, useState } from 'react';
import { callFunction, ApiError } from '../lib/api';
import { getInitData, waitForTelegramReady } from '../lib/telegram';

export type AuthState = 'loading' | 'no_profile' | 'freelancer' | 'owner' | 'administrator';

export interface Profile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'administrator' | 'employee';
  city?: string;
  status?: string;
  created_at?: string;
}

interface AuthContextType {
  state: AuthState;
  profile: Profile | null;
  error: string | null;
  refreshAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    setError(null);
    setState('loading');

    try {
      // DEV MODE: Skip auth and show admin screen directly
      if (import.meta.env.DEV) {
        const devProfile: Profile = {
          id: 'dev-admin-1',
          telegram_id: 406489240,
          first_name: 'Admin',
          last_name: 'Test',
          role: 'administrator',
          status: 'active',
        };
        console.log('✅ DEV MODE: Logged in as administrator');
        setProfile(devProfile);
        setState('administrator');
        return;
      }

      await waitForTelegramReady();

      const initData = getInitData();
      if (!initData) {
        console.log('No initData found, showing welcome screen');
        setState('no_profile');
        return;
      }

      console.log('Refreshing auth...');

      const data = await callFunction<{ profile: Profile | null }>(
        'tg-auth',
        {},
        { retries: 0, timeout: 8000 }
      );
      const authProfile = data.profile;

      if (!authProfile) {
        console.log('No profile found, user needs to register');
        setProfile(null);
        setState('no_profile');
        return;
      }

      console.log('✅ User authenticated, role:', authProfile.role);
      setProfile(authProfile);

      let authState: AuthState;
      if (authProfile.role === 'admin' || authProfile.role === 'administrator') {
        authState = 'administrator';
      } else if (authProfile.role === 'owner') {
        authState = 'owner';
      } else {
        authState = 'freelancer';
      }
      setState(authState);
    } catch (err) {
      console.error('Auth refresh error:', err);
      setError(err instanceof ApiError ? err.message : 'Unknown error');
      setProfile(null);
      // Показываем welcome даже при ошибке auth — пользователь может зарегистрироваться
      setState('no_profile');
    }
  };

  const logout = () => {
    console.log('Logging out...');
    setProfile(null);
    setState('no_profile');
    setError(null);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ state, profile, error, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
