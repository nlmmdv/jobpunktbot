import React, { createContext, useContext, useEffect, useState } from 'react';
import { callFunction, ApiError } from '../lib/api';
import { getInitData, waitForTelegramReady } from '../lib/telegram';

// 'error' — сервер не ответил (сеть/таймаут). Отличается от 'no_profile':
// существующего пользователя при обрыве нельзя гнать на регистрацию.
export type AuthState = 'loading' | 'no_profile' | 'error' | 'freelancer' | 'owner';

const AUTH_TIMEOUT_MS = 15000;
const AUTH_ATTEMPTS = 2;

export interface Profile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'employee';
  city?: string;
  status?: string;
  created_at?: string;
}

interface AuthContextType {
  state: AuthState;
  profile: Profile | null;
  error: string | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    setError(null);
    setState('loading');

    await waitForTelegramReady();

    const initData = getInitData();
    if (!initData) {
      // Вне Telegram (или подпись не пришла) — профиля нет, показываем welcome.
      console.log('No initData found, showing welcome screen');
      setState('no_profile');
      return;
    }

    // tg-auth гейтит весь вход, поэтому холодный старт функции или заминка сети
    // не должны выкидывать существующего пользователя на регистрацию: даём
    // больше времени и одну повторную попытку (abort сам callFunction не
    // ретраит — он не «retriable»).
    let lastError: unknown;
    for (let attempt = 1; attempt <= AUTH_ATTEMPTS; attempt++) {
      try {
        const data = await callFunction<{ profile: Profile | null }>(
          'tg-auth',
          {},
          { retries: 0, timeout: AUTH_TIMEOUT_MS }
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
        setState(
          authProfile.role === 'owner' || authProfile.role === 'admin' ? 'owner' : 'freelancer'
        );
        return;
      } catch (err) {
        lastError = err;
        console.error(`Auth attempt ${attempt}/${AUTH_ATTEMPTS} failed:`, err);
        if (attempt < AUTH_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    // Сервер так и не ответил — это НЕ «нет профиля». Показываем «Повторить».
    setError(lastError instanceof ApiError ? lastError.message : 'Не удалось связаться с сервером');
    setProfile(null);
    setState('error');
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ state, profile, error, refreshAuth }}>
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
