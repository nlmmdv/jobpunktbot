import React, { useEffect } from 'react';
import { Button, Text, Title } from '@telegram-apps/telegram-ui';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface WelcomeScreenProps {
  onStart: () => void;
  authError?: string | null;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, authError }) => {
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
  }, [onStart]);


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #F7F6FB 0%, #EDE4FB 50%, #F7F6FB 100%)',
    }}>
      <div style={{
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        marginBottom: '32px',
        boxShadow: '0 8px 24px rgba(109, 40, 217, 0.3)',
      }}>
        📦
      </div>
      <Title level="1" style={{
        marginBottom: '8px',
        color: '#17151F',
        fontSize: '28px',
        fontWeight: 800,
      }}>
        ПроПункт
      </Title>
      <Text style={{
        marginBottom: authError ? '16px' : '48px',
        color: '#6E6A7C',
        fontSize: '15px',
      }}>
        Биржа труда для ПВЗ
      </Text>
      {authError && (
        <Text style={{
          marginBottom: '24px',
          color: '#DC2626',
          fontSize: '13px',
          maxWidth: '320px',
          lineHeight: 1.4,
        }}>
          {authError}
        </Text>
      )}
      <Button
        size="l"
        onClick={onStart}
        style={{
          width: '100%',
          maxWidth: '280px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(109, 40, 217, 0.25)',
        }}
      >
        Начать
      </Button>
    </div>
  );
};
