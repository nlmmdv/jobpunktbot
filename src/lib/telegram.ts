import { delay } from './utils';

/** Дождаться инициализации Telegram WebApp и появления initData */
export async function waitForTelegramReady(timeoutMs = 3000): Promise<void> {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  webApp.ready();
  webApp.expand?.();
  // Страница теперь прокручивается, а вертикальный свайп в Telegram по умолчанию
  // закрывает мини-апп — пользователь ловил бы это при листании списка вверх.
  // Метод появился в Bot API 7.7, на старых клиентах его просто нет.
  webApp.disableVerticalSwipes?.();

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (webApp.initData) return;
    await delay(50);
  }
}

export const getTelegramUser = () => {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initDataUnsafe?.user) {
    return webApp.initDataUnsafe.user;
  }
  // Fallback для тестирования в браузере (администратор)
  if (import.meta.env.DEV) {
    return {
      id: 406489240,
      is_bot: false,
      first_name: 'Admin',
      last_name: 'Test',
      username: 'admintest',
      language_code: 'ru'
    };
  }
  return null;
};

export const getInitData = () => {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initData) {
    return webApp.initData;
  }
  // Fallback для тестирования в браузере
  if (import.meta.env.DEV) {
    const user = getTelegramUser();
    if (user) {
      return `user=${JSON.stringify(user)}&hash=dev-mode&auth_date=${Math.floor(Date.now() / 1000)}`;
    }
  }
  return null;
};
