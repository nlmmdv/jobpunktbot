import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callFunction } from '../lib/api';
import { Screen, Card, Button, Badge, Loading, SectionTitle } from '../components/ui';

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
  open_complaints?: number;
  active_blocks?: number;
  total_employees?: number;
  total_owners?: number;
  active_shifts?: number;
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

  const isModerator = profile?.role === 'admin';

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
        <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer' }}>← Назад</div>
        <div className="title">🔍 Модерация</div>
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
        <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer' }}>← Назад</div>
        <div className="title">🔍 Модерация</div>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer' }}>← Назад</div>
      <div className="title">🔍 Модерация</div>
      <div className="subtitle">Проверка контента</div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
        {['stats', 'users', 'vacancies', 'suspicious'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as Tab)}
            className="chip"
            style={{
              background: (t === 'suspicious' && tab === t)
                ? '#EF4444'
                : tab === t
                ? 'var(--accent-owner)'
                : 'transparent',
              color: (t === 'suspicious' && tab === t)
                ? '#fff'
                : tab === t
                ? '#fff'
                : 'var(--accent-owner)',
              borderColor: t === 'suspicious' ? (tab === t ? '#EF4444' : '#DC2626') : 'var(--accent-owner)',
            }}
          >
            {t === 'stats' && '📊 Статистика'}
            {t === 'users' && '👤 Пользователи'}
            {t === 'vacancies' && '📋 Вакансии'}
            {t === 'suspicious' && '⚠️ Подозрительные'}
          </button>
        ))}
      </div>

      {/* СТАТИСТИКА */}
      {tab === 'stats' && stats && (
        <>
          <SectionTitle>👥 Всего в системе</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Card variant="owner" onClick={() => setTab('users')} style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#2563EB' }}>{stats.total_employees ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Сотрудников</div>
            </Card>
            <Card variant="owner" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#10B981' }}>{stats.total_owners ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>ПВЗ</div>
            </Card>
            <Card variant="owner" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#7C3AED' }}>{stats.active_shifts ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Смен принято</div>
            </Card>
          </div>

          <SectionTitle>📈 Статистика сегодня/неделя</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Card
              variant="owner"
              onClick={() => setTab('users')}
              style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
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
            <Card variant="owner" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>{stats.open_complaints ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Открытых жалоб</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>📋 Разбор в разделах</div>
            </Card>
            <Card variant="owner" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#991B1B' }}>{stats.active_blocks ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Активных блокировок</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>🚫 Сейчас действуют</div>
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
