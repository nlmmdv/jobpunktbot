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

  // Вложенные экраны пока не приняли дизайн-систему и не имеют своего onBack,
  // поэтому «Назад» рисуем здесь. По мере перевода каждого экрана эта обёртка
  // для него убирается, а кнопка уезжает в его собственный ScreenHeader.
  if (screen !== 'menu') {
    return (
      <Screen>
        <BackButton onClick={back} variant="owner" />
        {screen === 'search' && <SearchEmployeesScreen />}
        {screen === 'vacancies' && <MyVacanciesScreen />}
        {screen === 'matches' && <OwnerMatchesScreen />}
        {screen === 'profile' && <ProfileScreen />}
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
