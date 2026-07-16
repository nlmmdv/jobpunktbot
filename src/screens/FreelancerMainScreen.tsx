import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FreelancerShiftsScreen } from './freelancer/FreelancerShiftsScreen';
import { VacanciesScreen } from './freelancer/VacanciesScreen';
import { AvailableShiftsScreen } from './freelancer/AvailableShiftsScreen';
import { FreelancerMatchesScreen } from './freelancer/FreelancerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { Screen, BackButton, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'shifts' | 'vacancies' | 'available' | 'matches' | 'profile';

const MENU: MenuItem<Tab>[] = [
  { screen: 'shifts', icon: '📋', label: 'Подработка' },
  { screen: 'vacancies', icon: '💼', label: 'Вакансии' },
  { screen: 'available', icon: '⏰', label: 'Замены' },
  { screen: 'matches', icon: '📬', label: 'Отклики' },
  { screen: 'profile', icon: '👤', label: 'Профиль', wide: true },
];

export const FreelancerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  // Вложенные экраны пока не приняли дизайн-систему и не имеют своего onBack,
  // поэтому «Назад» рисуем здесь. По мере перевода каждого экрана эта обёртка
  // для него убирается, а кнопка уезжает в его собственный ScreenHeader.
  if (screen !== 'menu') {
    return (
      <Screen>
        <BackButton onClick={back} variant="freelancer" />
        {screen === 'shifts' && <FreelancerShiftsScreen />}
        {screen === 'vacancies' && <VacanciesScreen />}
        {screen === 'available' && <AvailableShiftsScreen />}
        {screen === 'matches' && <FreelancerMatchesScreen />}
        {screen === 'profile' && <ProfileScreen />}
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="title">ПроПункт</div>
      <div className="subtitle">Привет, {profile?.first_name}!</div>
      <MenuGrid items={MENU} variant="freelancer" onSelect={setScreen} />
    </Screen>
  );
};
