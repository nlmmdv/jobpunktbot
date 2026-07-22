import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SearchEmployeesScreen } from './owner/SearchEmployeesScreen';
import { MyVacanciesScreen } from './owner/MyVacanciesScreen';
import { OwnerMatchesScreen } from './owner/OwnerMatchesScreen';
import { ShiftsHistoryScreen } from './owner/ShiftsHistoryScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { ModerationDashboard } from './ModerationDashboard';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'search' | 'vacancies' | 'matches' | 'history' | 'profile' | 'moderation';

const MENU: MenuItem<Tab>[] = [
  { screen: 'search', icon: '🔍', label: 'Поиск сотрудников' },
  { screen: 'vacancies', icon: '📋', label: 'Мои вакансии' },
  { screen: 'matches', icon: '📬', label: 'Отклики' },
  { screen: 'history', icon: '📜', label: 'История смен' },
  { screen: 'profile', icon: '👤', label: 'Профиль' },
];

const MODERATOR_MENU: MenuItem<Tab>[] = [
  ...MENU,
  { screen: 'moderation', icon: '🔍', label: 'Модерация' },
];

export const OwnerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  const isModerator = profile?.role === 'admin' || profile?.role === 'moderator';
  const menuItems = isModerator ? MODERATOR_MENU : MENU;

  // Каждый экран сам рисует свою шапку с «Назад» (ScreenHeader).
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="owner" />;
  if (screen === 'vacancies') return <MyVacanciesScreen onBack={back} />;
  if (screen === 'search') return <SearchEmployeesScreen onBack={back} />;
  if (screen === 'matches') return <OwnerMatchesScreen onBack={back} />;
  if (screen === 'history') return <ShiftsHistoryScreen onBack={back} />;
  if (screen === 'moderation') return <ModerationDashboard onBack={back} />;

  return (
    <Screen>
      <div className="title">ПроПункт</div>
      <div className="subtitle">Привет, {profile?.first_name}!{isModerator && ' 👮'}</div>
      <MenuGrid items={menuItems} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
