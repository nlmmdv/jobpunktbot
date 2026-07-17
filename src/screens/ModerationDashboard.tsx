import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callFunction } from '../lib/api';
import { Screen, ScreenHeader, Card, Button, Badge, Loading, SectionTitle, Chip } from '../components/ui';

interface NewUser {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  role: string;
  city?: string;
  created_at: string;
  has_spam?: boolean;
  about?: string;
}

interface Vacancy {
  id: string;
  address: string;
  description: string;
  telegram_id: number;
  first_name?: string;
  created_at: string;
  has_spam?: boolean;
}

interface Stats {
  new_users_today: number;
  new_vacancies_today: number;
  matches_this_week: number;
  suspicious_vacancies: number;
}

type Tab = 'stats' | 'users' | 'vacancies' | 'suspicious';

export const ModerationDashboard = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [users, setUsers] = useState<NewUser[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isModerator = profile?.role === 'admin' || profile?.role === 'moderator';

  useEffect(() => {
    if (!isModerator) return;
    loadData();
  }, [isModerator]);

  useEffect(() => {
    if (!isModerator) return;
    if (tab !== 'stats') {
      loadData();
    }
  }, [tab, isModerator]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Всегда загружаем все данные для работы фильтров
      const [statsData, usersData, vacanciesData] = await Promise.all([
        callFunction<{ stats: Stats }>('moderation-service', {
          action: 'stats',
        }),
        callFunction<{ users: NewUser[] }>('moderation-service', {
          action: 'new_users',
          limit: 50,
          offset: 0,
        }),
        callFunction<{ vacancies: Vacancy[] }>('moderation-service', {
          action: 'vacancies_for_review',
          limit: 50,
          offset: 0,
        }),
      ]);

      setStats(statsData.stats || null);
      setUsers(usersData.users || []);
      setVacancies(vacanciesData.vacancies || []);
    } catch (err) {
      console.error('Failed to load moderation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: number) => {
    if (!confirm('Вы уверены что хотите заблокировать этого пользователя?')) return;
    setActionLoading(true);
    try {
      await callFunction('moderation-service', {
        action: 'ban_user',
        userId,
      });
      alert('✅ Пользователь заблокирован');
      loadData();
    } catch (err) {
      alert(`❌ Ошибка: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVacancy = async (vacancyId: string) => {
    if (!confirm('Вы уверены что хотите удалить эту вакансию?')) return;
    setActionLoading(true);
    try {
      await callFunction('moderation-service', {
        action: 'delete_vacancy',
        vacancyId,
      });
      alert('✅ Вакансия удалена');
      loadData();
    } catch (err) {
      alert(`❌ Ошибка: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveVacancy = async (vacancyId: string) => {
    setActionLoading(true);
    try {
      await callFunction('moderation-service', {
        action: 'approve_vacancy',
        vacancyId,
      });
      alert('✅ Вакансия одобрена');
      loadData();
    } catch (err) {
      alert(`❌ Ошибка: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isModerator) {
    return (
      <Screen>
        <ScreenHeader title="🔍 Модерация" variant="owner" onBack={onBack} />
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            ❌ Доступ запрещён
          </div>
        </div>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="🔍 Модерация" variant="owner" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="🔍 Модерация" subtitle="Проверка контента" variant="owner" onBack={onBack} />

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        <button
          onClick={() => setTab('stats')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: tab === 'stats' ? '#2563EB' : '#f0f0f0',
            color: tab === 'stats' ? 'white' : '#666',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          📊 Статистика
        </button>
        <button
          onClick={() => setTab('users')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: tab === 'users' ? '#2563EB' : '#f0f0f0',
            color: tab === 'users' ? 'white' : '#666',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          👤 Пользователи
        </button>
        <button
          onClick={() => setTab('vacancies')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: tab === 'vacancies' ? '#2563EB' : '#f0f0f0',
            color: tab === 'vacancies' ? 'white' : '#666',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          📋 Вакансии
        </button>
        <button
          onClick={() => setTab('suspicious')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: tab === 'suspicious' ? '#EF4444' : '#f0f0f0',
            color: tab === 'suspicious' ? 'white' : '#666',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ⚠️ Подозрительные
        </button>
      </div>

      {/* СТАТИСТИКА */}
      {tab === 'stats' && stats && (
        <>
          <SectionTitle>📈 Статистика сегодня/неделя</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Card
              variant="owner"
              onClick={() => setTab('users')}
              style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', hover: { transform: 'scale(1.05)' } }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2563EB' }}>{stats.new_users_today}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Новых пользователей</div>
              <div style={{ fontSize: 10, color: '#2563EB', marginTop: 6, fontWeight: 600 }}>→ Открыть список</div>
            </Card>
            <Card
              variant="owner"
              onClick={() => setTab('vacancies')}
              style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>{stats.new_vacancies_today}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Новых вакансий</div>
              <div style={{ fontSize: 10, color: '#10B981', marginTop: 6, fontWeight: 600 }}>→ Открыть список</div>
            </Card>
            <Card
              variant="owner"
              style={{ textAlign: 'center', opacity: 0.6, cursor: 'not-allowed' }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{stats.matches_this_week}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Отклики на неделю</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>📊 Только просмотр</div>
            </Card>
            <Card
              variant="owner"
              onClick={() => setTab('suspicious')}
              style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{stats.suspicious_vacancies}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Подозрительных</div>
              <div style={{ fontSize: 10, color: '#EF4444', marginTop: 6, fontWeight: 600 }}>→ Открыть список</div>
            </Card>
          </div>
        </>
      )}

      {/* НОВЫЕ ПОЛЬЗОВАТЕЛИ */}
      {tab === 'users' && (
        <>
          <SectionTitle>👤 Новые пользователи (24 часа)</SectionTitle>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20 }}>
              Новых пользователей нет
            </div>
          ) : (
            users.map((user) => (
              <Card key={user.id} variant="owner" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {user.first_name} {user.last_name || ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      ID: {user.telegram_id}
                    </div>
                  </div>
                  {user.has_spam && <Badge tone="temp-f">⚠️ Спам</Badge>}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  📍 {user.city || 'Не указан'} • {user.role} • {new Date(user.created_at).toLocaleDateString('ru')}
                </div>

                {user.about && (
                  <div style={{ fontSize: 11, background: '#f5f5f5', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>📝 О себе:</div>
                    <div>{user.about}</div>
                  </div>
                )}

                <Button
                  small
                  tone="danger"
                  onClick={() => handleBanUser(user.telegram_id)}
                  disabled={actionLoading}
                >
                  🚫 Заблокировать
                </Button>
              </Card>
            ))
          )}
        </>
      )}

      {/* ВАКАНСИИ */}
      {tab === 'vacancies' && (
        <>
          <SectionTitle>📋 Вакансии на модерацию</SectionTitle>
          {vacancies.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20 }}>
              Нет вакансий на проверку
            </div>
          ) : (
            vacancies.map((vacancy) => (
              <Card key={vacancy.id} variant="owner" style={{ marginBottom: 12, borderLeft: vacancy.has_spam ? '4px solid #EF4444' : '4px solid #10B981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{vacancy.address}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      от {vacancy.first_name} • {new Date(vacancy.created_at).toLocaleDateString('ru')}
                    </div>
                  </div>
                  {vacancy.has_spam && <Badge tone="temp-f">⚠️ СПАМ</Badge>}
                </div>

                <div style={{ fontSize: 12, background: '#f5f5f5', padding: 10, borderRadius: 6, marginBottom: 10, maxHeight: 100, overflowY: 'auto' }}>
                  {vacancy.description}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    small
                    tone="outline"
                    onClick={() => handleApproveVacancy(vacancy.id)}
                    disabled={actionLoading}
                  >
                    ✅ Одобрить
                  </Button>
                  <Button
                    small
                    tone="danger"
                    onClick={() => handleDeleteVacancy(vacancy.id)}
                    disabled={actionLoading}
                  >
                    🗑️ Удалить
                  </Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {/* ПОДОЗРИТЕЛЬНЫЕ */}
      {tab === 'suspicious' && (
        <>
          <SectionTitle>⚠️ Подозрительные элементы</SectionTitle>
          {users.filter(u => u.has_spam).length === 0 && vacancies.filter(v => v.has_spam).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20 }}>
              Нет подозрительных элементов
            </div>
          ) : (
            <>
              {users.filter(u => u.has_spam).length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 12 }}>👤 Пользователи со спамом</div>
                  {users.filter(u => u.has_spam).map((user) => (
                    <Card key={user.id} variant="owner" style={{ marginBottom: 12, borderLeft: '4px solid #EF4444' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>
                            {user.first_name} {user.last_name || ''}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            ID: {user.telegram_id}
                          </div>
                        </div>
                        <Badge tone="temp-f">⚠️ Спам</Badge>
                      </div>

                      {user.about && (
                        <div style={{ fontSize: 11, background: '#fff5f5', padding: 8, borderRadius: 6, marginBottom: 8, color: '#EF4444' }}>
                          {user.about}
                        </div>
                      )}

                      <Button
                        small
                        tone="danger"
                        onClick={() => handleBanUser(user.telegram_id)}
                        disabled={actionLoading}
                      >
                        🚫 Заблокировать
                      </Button>
                    </Card>
                  ))}
                </>
              )}

              {vacancies.filter(v => v.has_spam).length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 12, marginTop: 20 }}>📋 Вакансии со спамом</div>
                  {vacancies.filter(v => v.has_spam).map((vacancy) => (
                    <Card key={vacancy.id} variant="owner" style={{ marginBottom: 12, borderLeft: '4px solid #EF4444' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{vacancy.address}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            от {vacancy.first_name} • {new Date(vacancy.created_at).toLocaleDateString('ru')}
                          </div>
                        </div>
                        <Badge tone="temp-f">⚠️ СПАМ</Badge>
                      </div>

                      <div style={{ fontSize: 12, background: '#fff5f5', padding: 10, borderRadius: 6, marginBottom: 10, maxHeight: 100, overflowY: 'auto', color: '#EF4444' }}>
                        {vacancy.description}
                      </div>

                      <Button
                        small
                        tone="danger"
                        onClick={() => handleDeleteVacancy(vacancy.id)}
                        disabled={actionLoading}
                      >
                        🗑️ Удалить
                      </Button>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
};
