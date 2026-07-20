import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'users' | 'vacancies' | 'system' | 'profile';

const ADMIN_MENU: MenuItem<Tab>[] = [
  { screen: 'users', icon: '👥', label: 'Управление пользователями', wide: true },
  { screen: 'vacancies', icon: '📋', label: 'Управление вакансиями', wide: true },
  { screen: 'system', icon: '⚙️', label: 'Системные настройки', wide: true },
];

export const AdminMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  // TODO: реализовать экраны администрирования
  if (screen === 'users') {
    return (
      <Screen>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>👥 Управление пользователями</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22 }}>
          Модерация профилей, блокировка пользователей
        </div>
        <button
          onClick={back}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-btn)',
            background: 'var(--accent-owner)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 20
          }}
        >
          ← Назад
        </button>
      </Screen>
    );
  }

  if (screen === 'vacancies') {
    return (
      <Screen>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>📋 Управление вакансиями</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22 }}>
          Модерация вакансий, удаление нарушений
        </div>
        <button
          onClick={back}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-btn)',
            background: 'var(--accent-owner)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 20
          }}
        >
          ← Назад
        </button>
      </Screen>
    );
  }

  if (screen === 'system') {
    return (
      <Screen>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>⚙️ Системные настройки</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22 }}>
          Конфигурация системы, логи, статистика
        </div>
        <button
          onClick={back}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-btn)',
            background: 'var(--accent-owner)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 20
          }}
        >
          ← Назад
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="title">Администрирование</div>
      <div className="subtitle">Привет, {profile?.first_name}! 👮</div>
      <MenuGrid items={ADMIN_MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
