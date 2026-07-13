import React, { useEffect, useState } from 'react';
import { Button, Text, Title } from '@telegram-apps/telegram-ui';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface WelcomeScreenProps {
  onSelectRole: (role: 'freelancer' | 'owner') => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectRole }) => {
  const [showRoles, setShowRoles] = useState(false);

  useEffect(() => {
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Setup MainButton
        window.Telegram.WebApp.MainButton.setParams({
          text: 'Начать',
          color: '#6D28D9',
          is_active: true,
          is_visible: true,
        });

        window.Telegram.WebApp.MainButton.onClick(() => {
          setShowRoles(true);
        });

        return () => {
          window.Telegram.WebApp.MainButton.offClick(() => {});
        };
      }
    } catch (error) {
      console.error('Telegram WebApp error:', error);
    }
  }, []);

  if (showRoles) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
        <Title level="1" style={{ textAlign: 'center', marginBottom: '16px' }}>Выберите роль</Title>

        <Button
          size="l"
          onClick={() => onSelectRole('freelancer')}
          style={{
            background: 'linear-gradient(135deg, #6D28D9, #5B21B6)',
            color: '#fff',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '30px', marginBottom: '8px' }}>💼</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>Ищу работу</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Фрилансер на ПВЗ</div>
        </Button>

        <Button
          size="l"
          onClick={() => onSelectRole('owner')}
          style={{
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: '#fff',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '30px', marginBottom: '8px' }}>🏢</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>Ищу сотрудников</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Владелец ПВЗ</div>
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '24px' }}>📦</div>
      <Title level="1" style={{ marginBottom: '8px' }}>ПроПункт</Title>
      <Text style={{ marginBottom: '16px', color: 'var(--tg-theme-hint-color)' }}>
        Биржа труда для ПВЗ
      </Text>
      <Text style={{ marginBottom: '32px', opacity: 0.7 }}>
        Соедините спрос и предложение на рынке курьерских услуг
      </Text>
      <Button size="l" onClick={() => setShowRoles(true)}>
        Начать
      </Button>
    </div>
  );
};
