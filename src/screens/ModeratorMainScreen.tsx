import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callFunction } from '../lib/api';
import { Screen, Loading, MenuGrid, type MenuItem } from '../components/ui';
import { PeopleScreen } from './moderator/PeopleScreen';
import { ShiftsScreen } from './moderator/ShiftsScreen';
import { JournalScreen } from './moderator/JournalScreen';
import { IncidentsScreen } from './moderator/IncidentsScreen';
import { pluralWith } from '../lib/utils';

interface UnconfirmedShift {
  id: string;
  address: string | null;
  date: string | null;
  start_time: string | null;
  freelancer_name: string | null;
  owner_name: string | null;
}

interface Incident {
  id: string;
  description: string | null;
  subject_name: string | null;
  reporter_name: string | null;
  created_at: string;
}

interface Attention {
  incidents_count: number;
  incidents: Incident[];
  unconfirmed_count: number;
  unconfirmed: UnconfirmedShift[];
  running_now: number;
  new_users_24h: number;
  new_vacancies_24h: number;
  active_blocks: number;
}

type Tab = 'menu' | 'people' | 'shifts' | 'journal' | 'incidents';

const MENU: MenuItem<Tab>[] = [
  { screen: 'incidents', icon: '🚫', label: 'Неявки', sub: 'Заявлены владельцами' },
  { screen: 'people', icon: '👥', label: 'Люди', sub: 'Владельцы и сотрудники' },
  { screen: 'shifts', icon: '📅', label: 'Смены', sub: 'Кто и где выходит' },
  { screen: 'journal', icon: '📜', label: 'Журнал', sub: 'Действия модераторов', wide: true },
];

export const ModeratorMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Tab>('menu');
  const [attention, setAttention] = useState<Attention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const back = () => setScreen('menu');

  const loadAttention = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ attention: Attention }>('moderation-service', {
        action: 'attention',
      });
      setAttention(data.attention);
    } catch (err) {
      console.error('Не удалось загрузить сводку:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить сводку');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === 'menu') loadAttention();
  }, [screen, loadAttention]);

  if (screen === 'people') return <PeopleScreen onBack={back} />;
  if (screen === 'shifts') return <ShiftsScreen onBack={back} />;
  if (screen === 'journal') return <JournalScreen onBack={back} />;
  if (screen === 'incidents') return <IncidentsScreen onBack={back} />;

  const alertCard = (
    tone: 'danger' | 'warning' | 'plain',
    icon: string,
    title: string,
    note: string,
    onClick?: () => void
  ) => {
    const palette = {
      danger: { bg: '#FEE2E2', border: '#FCA5A5', color: '#DC2626' },
      warning: { bg: '#FEF3C7', border: '#FCD34D', color: '#D97706' },
      plain: { bg: 'transparent', border: 'var(--border, #E5E7EB)', color: 'var(--text-primary)' },
    }[tone];

    return (
      <div
        onClick={onClick}
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          marginBottom: 8,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: palette.color }}>{title}</div>
          {onClick && <span style={{ fontSize: 14, color: palette.color }}>›</span>}
        </div>
        {note && (
          <div style={{ fontSize: 11, color: palette.color, opacity: 0.85, marginTop: 3 }}>{note}</div>
        )}
      </div>
    );
  };

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="title">🛡️ Модератор</div>
        <div
          onClick={loadAttention}
          style={{ fontSize: 12, color: 'var(--accent-owner, #2563EB)', cursor: 'pointer' }}
        >
          Обновить
        </div>
      </div>
      <div className="subtitle">{profile?.first_name}, контроль работы приложения</div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 16, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && attention && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 8px' }}>
            Требует внимания
          </div>

          {attention.incidents_count > 0 &&
            alertCard(
              'danger',
              '🚫',
              `${pluralWith(attention.incidents_count, ['неявка', 'неявки', 'неявок'])} от владельцев`,
              attention.incidents[0]
                ? `${attention.incidents[0].subject_name || 'Сотрудник'} не вышел · заявил ${
                    attention.incidents[0].reporter_name || 'владелец'
                  }`
                : 'Владелец подтвердил, что сотрудник не вышел',
              () => setScreen('incidents')
            )}

          {attention.unconfirmed_count > 0
            ? alertCard(
                'danger',
                '⚠️',
                `${pluralWith(attention.unconfirmed_count, ['смена', 'смены', 'смен'])} без подтверждения выхода`,
                attention.unconfirmed[0]
                  ? `Например: ${attention.unconfirmed[0].freelancer_name || 'сотрудник'} · ${
                      attention.unconfirmed[0].address || 'адрес не указан'
                    }`
                  : 'Смена началась, сотрудник не отметился',
                () => setScreen('shifts')
              )
            : attention.incidents_count === 0 &&
              alertCard('plain', '✅', 'Все начатые смены подтверждены', '')}

          {attention.active_blocks > 0 &&
            alertCard(
              'warning',
              '🚫',
              `${pluralWith(attention.active_blocks, ['действующая блокировка', 'действующие блокировки', 'действующих блокировок'])}`,
              'Проверьте, не истёк ли срок',
              () => setScreen('people')
            )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '16px 0' }}>
            {[
              { value: attention.running_now, label: 'Смен идёт' },
              { value: attention.new_users_24h, label: 'Новых за сутки' },
              { value: attention.new_vacancies_24h, label: 'Вакансий за сутки' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'var(--bg-card-owner-alt, #F9FAFB)',
                  borderRadius: 10,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <MenuGrid items={MENU} variant="owner" onSelect={setScreen} />
    </Screen>
  );
};
