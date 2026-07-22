import { useState, useMemo } from 'react';
import { Screen, TextField } from '../../components/ui';

interface Vacancy {
  id: string;
  title: string;
  company_name: string;
  salary_from: number;
  salary_to: number;
  city: string;
  description: string;
  status: 'active' | 'archived' | 'flagged';
  created_at: string;
  views: number;
  applications: number;
  flags_count: number;
}

export const VacancyManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'flagged' | 'archived'>('all');
  const [vacancies] = useState<Vacancy[]>([
    {
      id: '1',
      title: 'Курьер ПВЗ',
      company_name: 'ПВЗ "Альфа" - Москва',
      salary_from: 30000,
      salary_to: 40000,
      city: 'Москва',
      description: 'Требуется опытный курьер для работы в ПВЗ. Должны иметь опыт работы с посылками.',
      status: 'active',
      created_at: '2026-07-20',
      views: 145,
      applications: 12,
      flags_count: 0,
    },
    {
      id: '2',
      title: 'Сортировщик товара',
      company_name: 'ПВЗ "Бета" - СПб',
      salary_from: 25000,
      salary_to: 35000,
      city: 'СПб',
      description: 'Ищем внимательного сортировщика для работы на складе. Опыт приветствуется.',
      status: 'active',
      created_at: '2026-07-19',
      views: 89,
      applications: 5,
      flags_count: 0,
    },
    {
      id: '3',
      title: 'Администратор ПВЗ',
      company_name: 'ПВЗ "Альфа" - Москва',
      salary_from: 45000,
      salary_to: 55000,
      city: 'Москва',
      description: 'Вакансия помечена как подозрительная. Требуется модерация контента.',
      status: 'flagged',
      created_at: '2026-07-18',
      views: 234,
      applications: 18,
      flags_count: 3,
    },
    {
      id: '4',
      title: 'Упаковщик',
      company_name: 'ПВЗ "Гамма" - Казань',
      salary_from: 20000,
      salary_to: 30000,
      city: 'Казань',
      description: 'Требуется аккуратный упаковщик. Возможна неполная занятость.',
      status: 'archived',
      created_at: '2026-07-10',
      views: 56,
      applications: 2,
      flags_count: 0,
    },
    {
      id: '5',
      title: 'Менеджер по работе с клиентами',
      company_name: 'ПВЗ "Бета" - СПб',
      salary_from: 50000,
      salary_to: 65000,
      city: 'СПб',
      description: 'Опытный менеджер для работы с B2B клиентами. Требуется опыт в логистике.',
      status: 'active',
      created_at: '2026-07-19',
      views: 178,
      applications: 9,
      flags_count: 0,
    },
  ]);

  // Фильтрация вакансий
  const filteredVacancies = useMemo(() => {
    let result = vacancies;

    // Фильтр по статусу
    if (filterStatus !== 'all') {
      result = result.filter((v) => v.status === filterStatus);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.company_name.toLowerCase().includes(query) ||
          v.city.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [vacancies, filterStatus, searchQuery]);

  const stats = {
    total: vacancies.length,
    active: vacancies.filter((v) => v.status === 'active').length,
    flagged: vacancies.filter((v) => v.status === 'flagged').length,
    archived: vacancies.filter((v) => v.status === 'archived').length,
    totalViews: vacancies.reduce((sum, v) => sum + v.views, 0),
    totalApplications: vacancies.reduce((sum, v) => sum + v.applications, 0),
  };

  const getSalaryRange = (from: number, to: number) => {
    return `${(from / 1000).toFixed(0)}k - ${(to / 1000).toFixed(0)}k ₽`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#DCFCE7', color: '#16A34A', label: '✅ Активна' };
      case 'flagged':
        return { bg: '#FEE2E2', color: '#DC2626', label: '🚩 Помечена' };
      case 'archived':
        return { bg: '#E5E7EB', color: '#6B7280', label: '📦 Архив' };
      default:
        return { bg: '#F3F4F6', color: '#374151', label: '❓ Неизвестно' };
    }
  };

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">📋 Управление вакансиями</div>
      <div className="subtitle">Модерация вакансий и контроль публикаций</div>

      {/* Статистика */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div
          style={{
            background: 'var(--bg-card-owner-alt)',
            borderRadius: 'var(--radius-card-sm)',
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Всего вакансий</div>
        </div>
        <div
          style={{
            background: '#DCFCE7',
            borderRadius: 'var(--radius-card-sm)',
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#16A34A' }}>{stats.active}</div>
          <div style={{ fontSize: 11, color: '#16A34A' }}>Активных</div>
        </div>
        <div
          style={{
            background: '#FEE2E2',
            borderRadius: 'var(--radius-card-sm)',
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>{stats.flagged}</div>
          <div style={{ fontSize: 11, color: '#DC2626' }}>Помечено</div>
        </div>
        <div
          style={{
            background: '#E5E7EB',
            borderRadius: 'var(--radius-card-sm)',
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6B7280' }}>{stats.archived}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>В архиве</div>
        </div>
      </div>

      {/* Поиск */}
      <TextField
        placeholder="Поиск по названию, компании или городу..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        variant="owner"
        style={{ marginBottom: 12 }}
      />

      {/* Фильтры по статусу */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
        {['all', 'active', 'flagged', 'archived'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: filterStatus === status ? 'none' : '1px solid var(--border-card-owner)',
              background: filterStatus === status ? 'var(--accent-owner)' : 'white',
              color: filterStatus === status ? 'white' : 'var(--text-primary)',
              fontWeight: filterStatus === status ? 700 : 600,
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {status === 'all' && '📊 Все'}
            {status === 'active' && '✅ Активные'}
            {status === 'flagged' && '🚩 Помечены'}
            {status === 'archived' && '📦 Архив'}
          </button>
        ))}
      </div>

      {/* Список вакансий */}
      <div style={{ marginBottom: 16 }}>
        {filteredVacancies.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
            Вакансии не найдены
          </div>
        ) : (
          filteredVacancies.map((vacancy) => {
            const statusInfo = getStatusColor(vacancy.status);
            return (
              <div
                key={vacancy.id}
                style={{
                  background: 'var(--bg-card-owner-alt)',
                  border: '1px solid var(--border-card-owner)',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: 12,
                  marginBottom: 12,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Заголовок и статус */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {vacancy.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {vacancy.company_name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusInfo.label}
                    </div>
                  </div>
                </div>

                {/* Зарплата и локация */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 11 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>💰 </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{getSalaryRange(vacancy.salary_from, vacancy.salary_to)}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>📍 </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{vacancy.city}</span>
                  </div>
                </div>

                {/* Описание */}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                    lineHeight: '1.4',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {vacancy.description}
                </div>

                {/* Метрики */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 10, color: 'var(--text-secondary)' }}>
                  <div>👁️ Просмотров: {vacancy.views}</div>
                  <div>📝 Откликов: {vacancy.applications}</div>
                  <div>📅 Опубликована: {vacancy.created_at}</div>
                </div>

                {/* Флаги (если есть) */}
                {vacancy.flags_count > 0 && (
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #FBBF24',
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 10,
                      fontSize: 11,
                      color: '#D97706',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ На вакансию поступило {vacancy.flags_count} жалоб от пользователей
                  </div>
                )}

                {/* Кнопки действий */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  {vacancy.status === 'active' && (
                    <>
                      <button
                        style={{
                          flex: 1,
                          minWidth: '80px',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#FECACA';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#FEE2E2';
                        }}
                        onClick={() => alert(`❌ Вакансия "${vacancy.title}" удалена`)}
                      >
                        🗑️ Удалить
                      </button>
                      <button
                        style={{
                          flex: 1,
                          minWidth: '80px',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #D1D5DB',
                          background: 'white',
                          color: 'var(--text-primary)',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'var(--bg-card-owner)';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'white';
                        }}
                        onClick={() => alert(`📦 Вакансия "${vacancy.title}" архивирована`)}
                      >
                        📦 Архив
                      </button>
                    </>
                  )}

                  {vacancy.status === 'flagged' && (
                    <>
                      <button
                        style={{
                          flex: 1,
                          minWidth: '80px',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#DCFCE7',
                          color: '#16A34A',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLButtonElement).style.opacity = '0.8';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLButtonElement).style.opacity = '1';
                        }}
                        onClick={() => alert(`✅ Вакансия "${vacancy.title}" одобрена`)}
                      >
                        ✅ Одобрить
                      </button>
                      <button
                        style={{
                          flex: 1,
                          minWidth: '80px',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#FECACA';
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLButtonElement).style.background = '#FEE2E2';
                        }}
                        onClick={() => alert(`❌ Вакансия "${vacancy.title}" удалена`)}
                      >
                        🗑️ Удалить
                      </button>
                    </>
                  )}

                  {vacancy.status === 'archived' && (
                    <button
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #D1D5DB',
                        background: 'white',
                        color: 'var(--text-primary)',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'var(--bg-card-owner)';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'white';
                      }}
                      onClick={() => alert(`✅ Вакансия "${vacancy.title}" восстановлена`)}
                    >
                      ↩️ Восстановить
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Screen>
  );
};
