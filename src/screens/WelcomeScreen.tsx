import { useEffect } from 'react';
import { Button, ErrorText } from '../components/ui';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface WelcomeScreenProps {
  onStart: () => void;
  authError?: string | null;
}

export const WelcomeScreen = ({ onStart, authError }: WelcomeScreenProps) => {
  useEffect(() => {
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        // Кнопку «Начать» рисуем на странице (см. ниже), нативный MainButton
        // не используем, чтобы кнопка не дублировалась внутри Telegram.
        window.Telegram.WebApp.MainButton?.hide();
      }
    } catch (error) {
      console.error('Telegram WebApp error:', error);
    }
  }, []);

  return (
    <div
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <svg width="88" height="88" viewBox="0 0 72 72" fill="none" style={{ marginBottom: 14 }}>
        <path d="M36 6L64 20V52L36 66L8 52V20L36 6Z" fill="#6D28D9"></path>
        <path d="M36 6L64 20L36 34L8 20L36 6Z" fill="#8B5CF6"></path>
        <path d="M36 34V66L8 52V20L36 34Z" fill="#5B21B6"></path>
        <path d="M36 34V66L64 52V20L36 34Z" fill="#7C3AED"></path>
      </svg>
      <div className="title-lg">ПроПункт</div>
      <div className="subtitle" style={{ marginBottom: 28, color: 'var(--text-secondary)' }}>Биржа труда для ПВЗ</div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.5, marginBottom: 36, maxWidth: 280 }}></div>
      {authError && <ErrorText>{authError}</ErrorText>}
      <Button style={{ maxWidth: 280, padding: '15px 16px' }} onClick={onStart}>Начать</Button>
    </div>
  );
};
