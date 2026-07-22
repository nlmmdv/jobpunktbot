import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';
import { UserManagementScreen } from './admin/UserManagementScreen';
import { CompanyManagementScreen } from './admin/CompanyManagementScreen';
import { VacancyManagementScreen } from './admin/VacancyManagementScreen';
import { SystemSettingsScreen } from './admin/SystemSettingsScreen';

type Tab = 'menu' | 'users' | 'companies' | 'vacancies' | 'system' | 'profile';

const ADMIN_MENU: MenuItem<Tab>[] = [
  { screen: 'users', icon: '👥', label: 'Управление пользователями', wide: true },
  { screen: 'companies', icon: '🏢', label: 'Управление компаниями', wide: true },
  { screen: 'vacancies', icon: '📋', label: 'Управление вакансиями', wide: true },
  { screen: 'system', icon: '⚙️', label: 'Системные настройки', wide: true },
];

export const AdminMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  if (screen === 'users') {
    return <UserManagementScreen onBack={back} />;
  }

  if (screen === 'companies') {
    return <CompanyManagementScreen onBack={back} />;
  }

  if (screen === 'vacancies') {
    return <VacancyManagementScreen onBack={back} />;
  }

  if (screen === 'system') {
    return <SystemSettingsScreen onBack={back} />;
  }

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <div className="title" style={{ margin: 0 }}>Администрирование</div>
      </div>
      <div className="subtitle">Привет, {profile?.first_name}! 👮</div>
      <MenuGrid items={ADMIN_MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
