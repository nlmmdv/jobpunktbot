import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FreelancerShiftsScreen } from './freelancer/FreelancerShiftsScreen';
import { ShiftsHistoryScreen } from './freelancer/ShiftsHistoryScreen';
import { VacanciesScreen } from './freelancer/VacanciesScreen';
import { AvailableShiftsScreen } from './freelancer/AvailableShiftsScreen';
import { FreelancerMatchesScreen } from './freelancer/FreelancerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'shifts' | 'history' | 'vacancies' | 'available' | 'matches' | 'profile';

const MENU: MenuItem<Tab>[] = [
  { screen: 'shifts', icon: '📋', label: 'Подработка' },
  { screen: 'history', icon: '📜', label: 'История смен' },
  { screen: 'vacancies', icon: '💼', label: 'Вакансии' },
  { screen: 'available', icon: '⏰', label: 'Замены' },
  { screen: 'matches', icon: '📬', label: 'Отклики' },
  { screen: 'profile', icon: '👤', label: 'Профиль' },
];

export const FreelancerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  // Каждый экран сам рисует свою шапку с «Назад» (ScreenHeader).
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="freelancer" />;
  if (screen === 'vacancies') return <VacanciesScreen onBack={back} />;
  if (screen === 'available') return <AvailableShiftsScreen onBack={back} />;
  if (screen === 'shifts') return <FreelancerShiftsScreen onBack={back} />;
  if (screen === 'history') return <ShiftsHistoryScreen onBack={back} />;
  if (screen === 'matches') return <FreelancerMatchesScreen onBack={back} />;

  return (
    <Screen>
      <div className="title">ПроПункт</div>
      <div className="subtitle">Привет, {profile?.first_name}!</div>
      <MenuGrid items={MENU} variant="freelancer" onSelect={setScreen} />
    </Screen>
  );
};
