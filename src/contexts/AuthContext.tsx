import React, { createContext, useContext, useEffect, useState } from 'react';
import { callFunction, ApiError, BLOCKED_EVENT } from '../lib/api';
import { getInitData, waitForTelegramReady } from '../lib/telegram';

// 'error' — сервер не ответил (сеть/таймаут). Отличается от 'no_profile':
// существующего пользователя при обрыве нельзя гнать на регистрацию.
// 'moderator' — роль admin в БД: отдельный интерфейс контроля платформы.
export type AuthState = 'loading' | 'no_profile' | 'blocked' | 'error' | 'freelancer' | 'owner' | 'moderator';

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
  about?: string;
  status?: string;
  created_at?: string;
}

export interface BlockInfo {
  reason: string | null;
  unblock_at: string | null;
}

interface AuthContextType {
  state: AuthState;
  profile: Profile | null;
  error: string | null;
  /** Заполнено, когда state === 'blocked'. */
  block: BlockInfo | null;
  refreshAuth: () => Promise<void>;
  /** Обновить профиль в контексте после локального изменения (например
   *  сохранения на экране «Профиль»), чтобы UI сразу показал новые данные
   *  без повторной авторизации. */
  applyProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [block, setBlock] = useState<BlockInfo | null>(null);

  const stateForRole = (role: Profile['role']): AuthState =>
    role === 'admin' ? 'moderator' : role === 'owner' ? 'owner' : 'freelancer';

  /**
   * Блокировка проверяется отдельным вызовом: кого проверять, сервер определяет
   * по подписанному telegram_id. Без ретраев и с коротким таймаутом — это
   * вспомогательная проверка, она не должна задерживать вход на плохой сети.
   */
  const blockedCheck = async (): Promise<BlockInfo | null> => {
    try {
      const status = await callFunction<{
        is_blocked: boolean;
        reason: string | null;
        unblock_at: string | null;
      }>('check-block', {}, { retries: 0, timeout: 5000 });

      return status.is_blocked ? { reason: status.reason, unblock_at: status.unblock_at } : null;
    } catch (err) {
      // Недоступность проверки не должна закрывать вход добросовестным людям.
      console.warn('Не удалось проверить блокировку:', err);
      return null;
    }
  };

  const refreshAuth = async () => {
    setError(null);
    setBlock(null);
    setState('loading');

    // Локальная разработка: ?devRole=moderator|owner|freelancer подставляет профиль
    // без Telegram. Условие начинается с import.meta.env.DEV, чтобы сборщик вырезал
    // блок из прод-бандла целиком — вместе с чтением параметра из URL.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('devRole')) {
      const devRole = new URLSearchParams(window.location.search).get('devRole') as string;

      // ?devRole=blocked — посмотреть, что видит заблокированный.
      if (devRole === 'blocked') {
        setProfile({ id: 'dev-blocked', telegram_id: 111111111, first_name: 'Иван', role: 'employee' });
        setBlock({ reason: 'Сорвал три смены подряд', unblock_at: '2026-08-13T09:00:00Z' });
        setState('blocked');
        return;
      }

      const role: Profile['role'] = devRole === 'moderator' ? 'admin' : devRole === 'owner' ? 'owner' : 'employee';
      setProfile({
        id: `dev-${devRole}`,
        telegram_id: 406489240,
        first_name: devRole === 'moderator' ? 'Модератор' : devRole === 'owner' ? 'Пётр' : 'Иван',
        role,
        city: 'Москва',
        status: 'active',
      });
      setState(stateForRole(role));
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

        const blockInfo = await blockedCheck();
        if (blockInfo) {
          setProfile(authProfile);
          setBlock(blockInfo);
          setState('blocked');
          return;
        }

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

  // Если человека заблокировали, пока он работал, любой его следующий запрос
  // вернёт 403 с кодом BLOCKED. Перезапускаем авторизацию — она подтянет
  // причину со сроком и покажет экран блокировки.
  useEffect(() => {
    const onBlocked = () => {
      setState((current) => (current === 'blocked' ? current : 'loading'));
      refreshAuth();
    };
    window.addEventListener(BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(BLOCKED_EVENT, onBlocked);
  }, []);

  return (
    <AuthContext.Provider value={{ state, profile, error, block, refreshAuth, applyProfile: setProfile }}>
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
