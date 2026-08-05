import { useState } from 'react';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';
import { UserManagementScreen } from './admin/UserManagementScreen';
import { CompanyManagementScreen } from './admin/CompanyManagementScreen';
import { VacancyManagementScreen } from './admin/VacancyManagementScreen';
import { ShiftManagementScreen } from './admin/ShiftManagementScreen';
import { ModerationDashboard } from './ModerationDashboard';

type Tab = 'menu' | 'dashboard' | 'employees' | 'companies' | 'vacancies' | 'shifts';

const MODERATION_MENU: MenuItem<Tab>[] = [
  { screen: 'employees', icon: '👷', label: 'Сотрудники', sub: 'Жалобы и блокировки' },
  { screen: 'vacancies', icon: '📋', label: 'Вакансии', sub: 'Проверка публикаций' },
  { screen: 'shifts', icon: '📅', label: 'Смены', sub: 'Кто и где выходит' },
  { screen: 'companies', icon: '🏢', label: 'Компании', sub: 'Модерация ПВЗ' },
  { screen: 'dashboard', icon: '📊', label: 'Модерация', sub: 'Сводка и счётчики', wide: true },
];

/**
 * Раздел модерации внутри кабинета владельца. Доступ уже проверен вызывающим
 * (profile.role === 'admin'), но каждое действие дополнительно гейтится на
 * сервере в requireModerator — клиентская проверка тут только для навигации.
 */
export const ModerationHubScreen = ({ onBack }: { onBack: () => void }) => {
  const [screen, setScreen] = useState<Tab>('menu');
  const back = () => setScreen('menu');

  if (screen === 'dashboard') return <ModerationDashboard onBack={back} />;
  if (screen === 'employees') return <UserManagementScreen onBack={back} />;
  if (screen === 'companies') return <CompanyManagementScreen onBack={back} />;
  if (screen === 'vacancies') return <VacancyManagementScreen onBack={back} />;
  if (screen === 'shifts') return <ShiftManagementScreen onBack={back} />;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🛡️ Модерация</div>
      <div className="subtitle">Сотрудники, вакансии и смены</div>
      <MenuGrid items={MODERATION_MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
