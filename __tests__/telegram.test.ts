import { describe, it, expect, afterEach } from 'vitest';
import { getInitData, getTelegramUser, waitForTelegramReady } from '../src/lib/telegram';

// Управляем window.Telegram, который читает модуль.
declare global {
  interface Window {
    Telegram?: any;
  }
}

afterEach(() => {
  delete (window as any).Telegram;
});

describe('telegram', () => {
  describe('getTelegramUser', () => {
    it('returns the Telegram user when initDataUnsafe is present', () => {
      (window as any).Telegram = {
        WebApp: { initDataUnsafe: { user: { id: 42, first_name: 'Ivan' } } },
      };
      expect(getTelegramUser()).toEqual({ id: 42, first_name: 'Ivan' });
    });
  });

  describe('getInitData', () => {
    it('returns WebApp.initData when present', () => {
      (window as any).Telegram = { WebApp: { initData: 'user=x&hash=abc' } };
      expect(getInitData()).toBe('user=x&hash=abc');
    });
  });

  describe('waitForTelegramReady', () => {
    it('resolves immediately when Telegram is absent', async () => {
      delete (window as any).Telegram;
      await expect(waitForTelegramReady(100)).resolves.toBeUndefined();
    });

    it('calls ready()/expand() and resolves once initData appears', async () => {
      let ready = false;
      (window as any).Telegram = {
        WebApp: {
          get initData() {
            return ready ? 'user=x&hash=abc' : '';
          },
          ready: () => {
            ready = true;
          },
          expand: () => {},
        },
      };
      await expect(waitForTelegramReady(1000)).resolves.toBeUndefined();
    });
  });
});
