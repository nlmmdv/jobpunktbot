import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FreelancerShiftsScreen } from './freelancer/FreelancerShiftsScreen';
import { VacanciesScreen } from './freelancer/VacanciesScreen';
import { AvailableShiftsScreen } from './freelancer/AvailableShiftsScreen';
import { FreelancerMatchesScreen } from './freelancer/FreelancerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { FreelancerMyShiftsScreen } from './freelancer/FreelancerMyShiftsScreen';
import { MyResumeScreen } from './freelancer/MyResumeScreen';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'shifts' | 'vacancies' | 'available' | 'matches' | 'myshifts' | 'resume' | 'profile';

const MENU: MenuItem<Tab>[] = [
  { screen: 'shifts', icon: '📋', label: 'Подработка', sub: 'Смены по дням' },
  { screen: 'vacancies', icon: '💼', label: 'Вакансии', sub: 'Постоянная работа' },
  { screen: 'available', icon: '⏰', label: 'Замены', sub: 'Разовый выход' },
  { screen: 'matches', icon: '📬', label: 'Отклики', sub: 'Ответы и офферы' },
  { screen: 'myshifts', icon: '📅', label: 'Мои смены', sub: 'Расписание' },
  { screen: 'resume', icon: '📝', label: 'Моё резюме', sub: 'Анкета для ПВЗ' },
  { screen: 'profile', icon: '👤', label: 'Профиль', sub: 'Данные и рейтинг', wide: true },
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
  if (screen === 'matches') return <FreelancerMatchesScreen onBack={back} />;
  if (screen === 'myshifts') return <FreelancerMyShiftsScreen onBack={back} />;
  if (screen === 'resume') return <MyResumeScreen onBack={back} />;

  return (
    <Screen>
      <div className="title">Привет, {profile?.first_name} 👋</div>
      <div className="subtitle">Что ищем сегодня?</div>
      <MenuGrid items={MENU} variant="freelancer" onSelect={setScreen} />
    </Screen>
  );
};
