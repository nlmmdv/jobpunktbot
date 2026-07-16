import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SearchEmployeesScreen } from './owner/SearchEmployeesScreen';
import { MyVacanciesScreen } from './owner/MyVacanciesScreen';
import { OwnerMatchesScreen } from './owner/OwnerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'search' | 'vacancies' | 'matches' | 'profile';

const MENU: MenuItem<Tab>[] = [
  { screen: 'search', icon: '🔍', label: 'Поиск сотрудников' },
  { screen: 'vacancies', icon: '📋', label: 'Мои вакансии' },
  { screen: 'matches', icon: '📬', label: 'Отклики' },
  { screen: 'profile', icon: '👤', label: 'Профиль' },
];

export const OwnerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  // Каждый экран сам рисует свою шапку с «Назад» (ScreenHeader).
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="owner" />;
  if (screen === 'vacancies') return <MyVacanciesScreen onBack={back} />;
  if (screen === 'search') return <SearchEmployeesScreen onBack={back} />;
  if (screen === 'matches') return <OwnerMatchesScreen onBack={back} />;

  return (
    <Screen>
      <div className="title">ПроПункт</div>
      <div className="subtitle">Привет, {profile?.first_name}!</div>
      <MenuGrid items={MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
