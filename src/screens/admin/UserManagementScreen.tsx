import { useState, useMemo, useEffect } from 'react';
import { Screen, Button, TextField, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface User {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  role: string;
  city?: string;
  status: string;
  created_at: string;
}

interface Complaint {
  id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  reported_by: {
    id: string;
    first_name: string;
    last_name?: string;
    telegram_id: number;
  };
}

export const UserManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState<User[]>([
    {
      id: '1',
      telegram_id: 123456789,
      first_name: 'Иван',
      last_name: 'Петров',
      role: 'employee',
      city: 'Москва',
      status: 'active',
      created_at: '2026-07-15',
    },
    {
      id: '2',
      telegram_id: 987654321,
      first_name: 'Мария',
      last_name: 'Сидорова',
      role: 'freelancer',
      city: 'СПб',
      status: 'active',
      created_at: '2026-07-16',
    },
    {
      id: '3',
      telegram_id: 555666777,
      first_name: 'Анна',
      last_name: 'Коваленко',
      role: 'employee',
      city: 'Казань',
      status: 'active',
      created_at: '2026-07-17',
    },
  ]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [blockDuration, setBlockDuration] = useState('1');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [complaints, setComplaints] = useState<Record<string, Complaint[]>>({
    // Тестовые жалобы на первого пользователя
    '1': [
      {
        id: 'complaint-1',
        reason: 'Плохое поведение',
        description: 'Грубо разговаривал с клиентом, не выполнил работу как договорено',
        status: 'open',
        created_at: '2026-07-20T14:30:00',
        reported_by: {
          id: '2',
          first_name: 'Мария',
          last_name: 'Сидорова',
          telegram_id: 987654321,
        },
      },
      {
        id: 'complaint-2',
        reason: 'Опоздание',
        description: 'Опоздал на 30 минут, не предупредил',
        status: 'resolved',
        created_at: '2026-07-19T10:15:00',
        reported_by: {
          id: '3',
          first_name: 'Анна',
          last_name: 'Коваленко',
          telegram_id: 555666777,
        },
      },
    ],
    // Нет жалоб на других пользователей
    '2': [],
    '3': [],
  });
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // Поиск пользователей
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
        user.telegram_id.toString().includes(query)
    );
  }, [searchQuery, users]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Временная блокировка
  const handleBlockUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    if (selectedUserId && selectedUser) {
      try {
        const durationMinutes =
          blockDuration === '1' ? 60 : blockDuration === '24' ? 24 * 60 : 7 * 24 * 60;
        const duration =
          blockDuration === '1' ? 'час' : blockDuration === '24' ? 'день' : 'неделю';

        await callFunction('block-user', {
          blocked_user_id: selectedUserId,
          duration_minutes: durationMinutes,
          reason: 'Блокировка администратором',
        });

        alert(
          `✅ ${selectedUser.first_name} заблокирован на ${duration} (до ${new Date(
            Date.now() + parseInt(blockDuration) * 3600000
          ).toLocaleString('ru')})`
        );
        setShowBlockModal(false);
      } catch (err) {
        console.error('Error blocking user:', err);
        alert('❌ Ошибка при блокировке пользователя');
      }
    }
  };

  // Предупреждение
  const handleWarnUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      const result = await callFunction<{
        warning: { id: string };
        auto_blocked: boolean;
        warning_count: number;
      }>('warn-user', {
        warned_user_id: userId,
        reason: 'Предупреждение администратором',
        severity: 'mild',
      });

      if (result.auto_blocked) {
        alert(
          `⚠️ Предупреждение #${result.warning_count} отправлено ${user.first_name}\n\n` +
            `⚠️ Пользователь автоматически заблокирован на 7 дней после ${result.warning_count} предупреждений`
        );
      } else {
        alert(
          `⚠️ Предупреждение #${result.warning_count} отправлено пользователю ${user.first_name}`
        );
      }
    } catch (err) {
      console.error('Error warning user:', err);
      alert('❌ Ошибка при отправке предупреждения');
    }
  };

  // Загрузка жалоб на пользователя
  const loadComplaints = async (userId: string) => {
    if (userId in complaints) {
      setSelectedUserId(userId);
      setShowComplaintsModal(true);
      return;
    }

    setComplaintsLoading(true);
    try {
      const data = await callFunction<{ complaints: Complaint[] }>('get-user-complaints', {
        user_id: userId,
      });
      setComplaints((prev) => ({
        ...prev,
        [userId]: data.complaints,
      }));
      setSelectedUserId(userId);
      setShowComplaintsModal(true);
    } catch (err) {
      console.error('Error loading complaints:', err);
      // В DEV режиме просто показываем пустой список если функция недоступна
      setComplaints((prev) => ({
        ...prev,
        [userId]: [],
      }));
      setSelectedUserId(userId);
      setShowComplaintsModal(true);
    } finally {
      setComplaintsLoading(false);
    }
  };

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">👥 Управление пользователями</div>
      <div className="subtitle">Модерация профилей и действия с пользователями</div>

      {/* Поиск */}
      <TextField
        placeholder="Поиск по имени или ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        variant="owner"
        style={{ marginBottom: 16 }}
      />

      {/* Список пользователей */}
      <div style={{ marginBottom: 16 }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
            Пользователи не найдены
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              style={{
                background: 'var(--bg-card-owner-alt)',
                border: '1px solid var(--border-card-owner)',
                borderRadius: 'var(--radius-card-sm)',
                padding: 12,
                marginBottom: 12,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Информация пользователя */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user.first_name} {user.last_name || ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  ID: {user.telegram_id}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📍 {user.city} • {user.role} • Зарегистрирован: {user.created_at}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: user.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                      color: user.status === 'active' ? '#16A34A' : '#DC2626',
                      fontWeight: 600,
                    }}
                  >
                    {user.status === 'active' ? '✅ Активен' : '🚫 Заблокирован'}
                  </div>
                  {complaints[user.id]?.length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: '#FEF3C7',
                        color: '#D97706',
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ Жалоб: {complaints[user.id].length}
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопки действий */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => handleWarnUser(user.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-card-owner)',
                    background: 'white',
                    color: 'var(--accent-owner)',
                    fontSize: 11,
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
                >
                  ⚠️ Предупреждение
                </button>

                <button
                  onClick={() => loadComplaints(user.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #F59E0B',
                    background: '#FFFBEB',
                    color: '#D97706',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    (e.target as HTMLButtonElement).style.background = '#FEF3C7';
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLButtonElement).style.background = '#FFFBEB';
                  }}
                >
                  📋 Жалобы ({complaints[user.id]?.length || 0})
                </button>

                <button
                  onClick={() => handleBlockUser(user.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    fontSize: 11,
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
                >
                  🚫 Блокировка
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно жалоб */}
      {showComplaintsModal && selectedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflowY: 'auto',
          }}
          onClick={() => setShowComplaintsModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 400,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              📋 Жалобы на {selectedUser.first_name}
            </div>

            {complaintsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Загрузка...
              </div>
            ) : complaints[selectedUser.id]?.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Нет жалоб на этого пользователя
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {complaints[selectedUser.id]?.map((complaint) => (
                  <div
                    key={complaint.id}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {complaint.reported_by.first_name} {complaint.reported_by.last_name || ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      ID: {complaint.reported_by.telegram_id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Причина: <strong>{complaint.reason}</strong>
                    </div>
                    {complaint.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontStyle: 'italic' }}>
                        "{complaint.description}"
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#6B7280' }}>
                      {new Date(complaint.created_at).toLocaleString('ru')}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 6,
                        padding: '3px 6px',
                        borderRadius: 4,
                        display: 'inline-block',
                        background: complaint.status === 'open' ? '#FEF3C7' : '#DCFCE7',
                        color: complaint.status === 'open' ? '#D97706' : '#16A34A',
                        fontWeight: 600,
                      }}
                    >
                      {complaint.status === 'open' ? '🔔 Открыта' : '✅ Закрыта'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowComplaintsModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card-owner)',
                  background: 'white',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно блокировки */}
      {showBlockModal && selectedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowBlockModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 300,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              🚫 Блокировка пользователя
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Блокировать {selectedUser.first_name}?
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                ⏱️ Выберите продолжительность блокировки:
              </label>
              <select
                value={blockDuration}
                onChange={(e) => setBlockDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card-owner)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="1">1 час</option>
                <option value="24">1 день (24 часа)</option>
                <option value="168">1 неделя (7 дней)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmBlock}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#DC2626',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Заблокировать
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card-owner)',
                  background: 'white',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
};
