import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SearchEmployeesScreen } from './owner/SearchEmployeesScreen';
import { MyVacanciesScreen } from './owner/MyVacanciesScreen';
import { OwnerMatchesScreen } from './owner/OwnerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { Screen, BackButton, MenuGrid, type MenuItem } from '../components/ui';

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

  // Переведённые на дизайн-систему экраны сами рисуют шапку с «Назад».
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="owner" />;
  if (screen === 'vacancies') return <MyVacanciesScreen onBack={back} />;
  if (screen === 'search') return <SearchEmployeesScreen onBack={back} />;

  // Экран откликов пока со старыми стилями и без своего onBack — «Назад» даём здесь.
  if (screen !== 'menu') {
    return (
      <Screen>
        <BackButton onClick={back} variant="owner" />
        {screen === 'matches' && <OwnerMatchesScreen />}
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="title">ПроПункт</div>
      <div className="subtitle">Привет, {profile?.first_name}!</div>
      <MenuGrid items={MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
