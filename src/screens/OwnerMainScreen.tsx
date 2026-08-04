import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SearchEmployeesScreen } from './owner/SearchEmployeesScreen';
import { MyVacanciesScreen } from './owner/MyVacanciesScreen';
import { OwnerMatchesScreen } from './owner/OwnerMatchesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { OwnerMyShiftsScreen } from './owner/OwnerMyShiftsScreen';
import { ModerationHubScreen } from './ModerationHubScreen';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';

type Tab = 'menu' | 'search' | 'vacancies' | 'matches' | 'myshifts' | 'profile' | 'moderation';

const MENU: MenuItem<Tab>[] = [
  { screen: 'search', icon: '🔍', label: 'Поиск сотрудников', sub: 'Резюме и замены' },
  { screen: 'vacancies', icon: '📋', label: 'Мои вакансии', sub: 'Публикации' },
  { screen: 'matches', icon: '📬', label: 'Отклики', sub: 'Входящие заявки' },
  { screen: 'myshifts', icon: '📅', label: 'Мои смены', sub: 'Расписание' },
  { screen: 'profile', icon: '👤', label: 'Профиль', sub: 'Данные и рейтинг', wide: true },
];

// Модерация — отдельный пункт, а не отдельный интерфейс: роль в profiles одна,
// и админ, который сам держит ПВЗ, не должен терять свой кабинет.
const MODERATOR_MENU: MenuItem<Tab>[] = [
  ...MENU,
  { screen: 'moderation', icon: '🛡️', label: 'Модерация', sub: 'Жалобы и блокировки', wide: true },
];

export const OwnerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  const isModerator = profile?.role === 'admin';

  // Каждый экран сам рисует свою шапку с «Назад» (ScreenHeader).
  if (screen === 'profile') return <ProfileScreen onBack={back} variant="owner" />;
  if (screen === 'vacancies') return <MyVacanciesScreen onBack={back} />;
  if (screen === 'search') return <SearchEmployeesScreen onBack={back} />;
  if (screen === 'matches') return <OwnerMatchesScreen onBack={back} />;
  if (screen === 'myshifts') return <OwnerMyShiftsScreen onBack={back} />;
  if (screen === 'moderation' && isModerator) return <ModerationHubScreen onBack={back} />;

  return (
    <Screen>
      <div className="title">Привет, {profile?.first_name} 👋{isModerator && ' 🛡️'}</div>
      <div className="subtitle">Кого ищем сегодня?</div>
      <MenuGrid items={isModerator ? MODERATOR_MENU : MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
