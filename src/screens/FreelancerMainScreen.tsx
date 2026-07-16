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

  // Переведённые на дизайн-систему экраны сами рисуют шапку с «Назад».
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="freelancer" />;
  if (screen === 'vacancies') return <VacanciesScreen onBack={back} />;
  if (screen === 'available') return <AvailableShiftsScreen onBack={back} />;
  if (screen === 'shifts') return <FreelancerShiftsScreen onBack={back} />;

  // Экран откликов пока со старыми стилями и без своего onBack — «Назад» даём здесь.
  if (screen !== 'menu') {
    return (
      <Screen>
        <BackButton onClick={back} variant="freelancer" />
        {screen === 'matches' && <FreelancerMatchesScreen />}
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
