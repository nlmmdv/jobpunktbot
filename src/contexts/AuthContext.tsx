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
  // 'admin' — единственная роль модератора: CHECK в profiles допускает только
  // owner / employee / admin. Админ работает в интерфейсе владельца, а модерация
  // висит отдельным пунктом меню — так он не теряет доступ к своему кабинету.
  role: 'owner' | 'admin' | 'employee';
  city?: string;
  about?: string;
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
  /** Обновить профиль в контексте после локального изменения (например
   *  сохранения на экране «Профиль»), чтобы UI сразу показал новые данные
   *  без повторной авторизации. */
  applyProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Подставные профили для локальной разработки: ?devRole=freelancer|owner|admin.
const DEV_PROFILES: Record<string, Profile> = {
  freelancer: {
    id: 'dev-freelancer-1',
    telegram_id: 123456789,
    first_name: 'Иван',
    last_name: 'Фрилансер',
    role: 'employee',
    city: 'Москва',
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    rating: 4.8,
  },
  owner: {
    id: 'dev-owner-1',
    telegram_id: 111222333,
    first_name: 'Петр',
    last_name: 'Владелец',
    role: 'owner',
    city: 'Москва',
    status: 'active',
    created_at: '2023-06-20T14:45:00Z',
    rating: 4.5,
  },
  admin: {
    id: 'dev-admin-1',
    telegram_id: 406489240,
    first_name: 'Admin',
    last_name: 'Test',
    role: 'admin',
    city: 'Москва',
    status: 'active',
    created_at: '2022-01-01T00:00:00Z',
    rating: 5.0,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateForRole = (role: Profile['role']): AuthState =>
    role === 'owner' || role === 'admin' ? 'owner' : 'freelancer';

  /**
   * Блокировка проверяется одним вызовом: субъекты (пользователь и его компания)
   * определяются на сервере по подписанному telegram_id.
   * Возвращает true, если вход нужно прервать.
   */
  const isBlocked = async (): Promise<boolean> => {
    try {
      const status = await callFunction<{
        is_blocked: boolean;
        blocked_subject: 'user' | 'company' | null;
        blocks: { reason: string; unblock_at: string | null }[];
      }>(
        'check-company-block',
        {},
        // Без ретраев и с коротким таймаутом: вспомогательная проверка на пути
        // входа не должна задерживать логин на плохой сети.
        { retries: 0, timeout: 5000 }
      );

      if (!status.is_blocked) return false;

      const block = status.blocks[0];
      const unblockTime = block?.unblock_at
        ? new Date(block.unblock_at).toLocaleString('ru')
        : 'бессрочно';
      const subject =
        status.blocked_subject === 'company' ? 'Ваша компания заблокирована' : 'Ваш аккаунт заблокирован';

      setError(`🚫 ${subject}.\n\nПричина: ${block?.reason || 'не указана'}\nРазблокировка: ${unblockTime}`);
      setProfile(null);
      setState('no_profile');
      return true;
    } catch (err) {
      // Недоступность проверки не должна закрывать вход добросовестным людям.
      console.warn('Error checking block status:', err);
      return false;
    }
  };

  const refreshAuth = async () => {
    setError(null);
    setState('loading');

    // Условие начинается с import.meta.env.DEV, чтобы сборщик вырезал весь блок
    // из прод-бандла целиком — вместе с чтением параметра из URL.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('devRole')) {
      const devRole = new URLSearchParams(window.location.search).get('devRole') as string;
      const devProfile = DEV_PROFILES[devRole] || DEV_PROFILES.admin;
      console.log(`✅ DEV MODE: вход как ${devProfile.role}`);
      setProfile(devProfile);
      setState(stateForRole(devProfile.role));
      return;
    }

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

        if (await isBlocked()) return;

        console.log('✅ User authenticated, role:', authProfile.role);
        setProfile(authProfile);
        setState(stateForRole(authProfile.role));
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
    <AuthContext.Provider value={{ state, profile, error, refreshAuth, applyProfile: setProfile }}>
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
