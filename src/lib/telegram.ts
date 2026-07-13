export const getTelegramUser = () => {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initDataUnsafe?.user) {
    return webApp.initDataUnsafe.user;
  }
  // Fallback для тестирования в браузере
  if (import.meta.env.DEV) {
    return { id: 123456789, first_name: 'Test', last_name: 'User', username: 'testuser' };
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
