import { useState, useMemo } from 'react';
import { Screen, Button, TextField, Loading } from '../../components/ui';

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

  const confirmBlock = () => {
    if (selectedUserId) {
      const duration = blockDuration === '1' ? 'час' : blockDuration === '24' ? 'день' : 'неделю';
      alert(
        `✅ ${selectedUser?.first_name} заблокирован на ${duration} (до ${new Date(
          Date.now() + parseInt(blockDuration) * 3600000
        ).toLocaleString('ru')})`
      );
      setShowBlockModal(false);
    }
  };

  // Предупреждение
  const handleWarnUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    alert(`⚠️ Предупреждение отправлено пользователю ${user?.first_name}`);
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
                <div
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    display: 'inline-block',
                    marginTop: 6,
                    background: user.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                    color: user.status === 'active' ? '#16A34A' : '#DC2626',
                    fontWeight: 600,
                  }}
                >
                  {user.status === 'active' ? '✅ Активен' : '🚫 Заблокирован'}
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
