import { useState } from 'react';
import { Screen, MenuGrid, type MenuItem } from '../components/ui';
import { UserManagementScreen } from './admin/UserManagementScreen';
import { CompanyManagementScreen } from './admin/CompanyManagementScreen';
import { VacancyManagementScreen } from './admin/VacancyManagementScreen';
import { ModerationDashboard } from './ModerationDashboard';

type Tab = 'menu' | 'dashboard' | 'users' | 'companies' | 'vacancies';

const MODERATION_MENU: MenuItem<Tab>[] = [
  { screen: 'dashboard', icon: '📊', label: 'Сводка', sub: 'Статистика и спам', wide: true },
  { screen: 'users', icon: '👥', label: 'Пользователи', sub: 'Жалобы и блокировки', wide: true },
  { screen: 'companies', icon: '🏢', label: 'Компании', sub: 'Модерация ПВЗ', wide: true },
  { screen: 'vacancies', icon: '📋', label: 'Вакансии', sub: 'Проверка публикаций', wide: true },
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
  if (screen === 'users') return <UserManagementScreen onBack={back} />;
  if (screen === 'companies') return <CompanyManagementScreen onBack={back} />;
  if (screen === 'vacancies') return <VacancyManagementScreen onBack={back} />;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🛡️ Модерация</div>
      <div className="subtitle">Жалобы, предупреждения и блокировки</div>
      <MenuGrid items={MODERATION_MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
