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
  photo_url?: string;
  rating?: number;
  owner_id?: string;
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
      // DEV MODE: подставной профиль только при явном ?devRole в URL.
      // Без параметра локальная сборка идёт обычным путём через tg-auth,
      // чтобы модерацию можно было проверять на реальных данных.
      const params = new URLSearchParams(window.location.search);
      const devRole = params.get('devRole');

      if (import.meta.env.DEV && devRole) {
        let devProfile: Profile;
        let authState: AuthState;

        if (devRole === 'freelancer') {
          devProfile = {
            id: 'dev-freelancer-1',
            telegram_id: 123456789,
            first_name: 'Иван',
            last_name: 'Фрилансер',
            role: 'employee',
            city: 'Москва',
            status: 'active',
            created_at: '2024-01-15T10:30:00Z',
            rating: 4.8,
          };
          authState = 'freelancer';
          console.log('✅ DEV MODE: Logged in as freelancer');
        } else if (devRole === 'owner') {
          devProfile = {
            id: 'dev-owner-1',
            telegram_id: 111222333,
            first_name: 'Петр',
            last_name: 'Владелец',
            role: 'owner',
            city: 'Москва',
            status: 'active',
            created_at: '2023-06-20T14:45:00Z',
            rating: 4.5,
          };
          authState = 'owner';
          console.log('✅ DEV MODE: Logged in as owner');
        } else {
          devProfile = {
            id: 'dev-admin-1',
            telegram_id: 406489240,
            first_name: 'Admin',
            last_name: 'Test',
            role: 'admin',
            status: 'active',
            created_at: '2022-01-01T00:00:00Z',
            rating: 5.0,
          };
          authState = 'administrator';
          console.log('✅ DEV MODE: Logged in as administrator');
        }

        setProfile(devProfile);
        setState(authState);
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

      // Проверить блокировку: один вызов проверяет и пользователя, и его компанию,
      // субъекты определяются на сервере по подписанному telegram_id.
      try {
        const blockStatus = await callFunction<{
          is_blocked: boolean;
          blocked_subject: 'user' | 'company' | null;
          blocks: { reason: string; unblock_at: string | null }[];
        }>('check-company-block', {});

        if (blockStatus.is_blocked) {
          const block = blockStatus.blocks[0];
          const unblockTime = block?.unblock_at
            ? new Date(block.unblock_at).toLocaleString('ru')
            : 'бессрочно';
          const subject =
            blockStatus.blocked_subject === 'company' ? 'Ваша компания заблокирована' : 'Ваш аккаунт заблокирован';
          setError(
            `🚫 ${subject}.\n\nПричина: ${block?.reason || 'не указана'}\nРазблокировка: ${unblockTime}`
          );
          setState('no_profile');
          return;
        }
      } catch (err) {
        // Недоступность проверки не должна закрывать вход добросовестным пользователям.
        console.warn('Error checking block status:', err);
      }

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
