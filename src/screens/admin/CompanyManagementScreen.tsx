import { useState, useMemo } from 'react';
import { Screen, TextField } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Company {
  id: string;
  telegram_id: number;
  organization_name: string;
  phone?: string;
  city?: string;
  status: string;
  created_at: string;
}

interface CompanyComplaint {
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

export const CompanyManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies] = useState<Company[]>([
    {
      id: '1',
      telegram_id: 111222333,
      organization_name: 'ПВЗ "Альфа" - Москва',
      phone: '+7 (495) 123-45-67',
      city: 'Москва',
      status: 'active',
      created_at: '2026-06-01',
    },
    {
      id: '2',
      telegram_id: 444555666,
      organization_name: 'ПВЗ "Бета" - СПб',
      phone: '+7 (812) 987-65-43',
      city: 'СПб',
      status: 'active',
      created_at: '2026-06-15',
    },
    {
      id: '3',
      telegram_id: 777888999,
      organization_name: 'ПВЗ "Гамма" - Казань',
      phone: '+7 (843) 555-12-34',
      city: 'Казань',
      status: 'active',
      created_at: '2026-07-01',
    },
  ]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [blockDuration, setBlockDuration] = useState('1');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [complaints, setComplaints] = useState<Record<string, CompanyComplaint[]>>({
    // Тестовые жалобы на первую компанию
    '1': [
      {
        id: 'company-complaint-1',
        reason: 'Плохое обслуживание',
        description: 'Невежливый персонал, долгое ожидание при оформлении',
        status: 'open',
        created_at: '2026-07-20T10:30:00',
        reported_by: {
          id: 'user-1',
          first_name: 'Петр',
          last_name: 'Иванов',
          telegram_id: 123456789,
        },
      },
      {
        id: 'company-complaint-2',
        reason: 'Проблема с доставкой',
        description: 'Посылка доставлена в плохом состоянии',
        status: 'resolved',
        created_at: '2026-07-18T15:45:00',
        reported_by: {
          id: 'user-2',
          first_name: 'Елена',
          last_name: 'Петрова',
          telegram_id: 987654321,
        },
      },
    ],
    '2': [],
    '3': [],
  });
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // Поиск компаний
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (company) =>
        company.organization_name.toLowerCase().includes(query) ||
        company.telegram_id.toString().includes(query) ||
        company.city?.toLowerCase().includes(query)
    );
  }, [searchQuery, companies]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Временная блокировка компании
  const handleBlockCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setShowBlockModal(true);
  };

  const confirmBlock = () => {
    if (selectedCompanyId) {
      const duration = blockDuration === '1' ? 'час' : blockDuration === '24' ? 'день' : 'неделю';
      alert(
        `✅ ${selectedCompany?.organization_name} заблокирована на ${duration} (до ${new Date(
          Date.now() + parseInt(blockDuration) * 3600000
        ).toLocaleString('ru')})`
      );
      setShowBlockModal(false);
    }
  };

  // Предупреждение компании
  const handleWarnCompany = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    alert(`⚠️ Предупреждение отправлено компании ${company?.organization_name}`);
  };

  // Загрузка жалоб на компанию
  const loadComplaints = async (companyId: string) => {
    if (companyId in complaints) {
      setSelectedCompanyId(companyId);
      setShowComplaintsModal(true);
      return;
    }

    setComplaintsLoading(true);
    try {
      const data = await callFunction<{ complaints: CompanyComplaint[] }>('get-company-complaints', {
        company_id: companyId,
      });
      setComplaints((prev) => ({
        ...prev,
        [companyId]: data.complaints,
      }));
      setSelectedCompanyId(companyId);
      setShowComplaintsModal(true);
    } catch (err) {
      console.error('Error loading company complaints:', err);
      // В DEV режиме просто показываем пустой список если функция недоступна
      setComplaints((prev) => ({
        ...prev,
        [companyId]: [],
      }));
      setSelectedCompanyId(companyId);
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
      <div className="title">🏢 Управление компаниями</div>
      <div className="subtitle">Модерация ПВЗ и действия с компаниями</div>

      {/* Поиск */}
      <TextField
        placeholder="Поиск по названию, городу или ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        variant="owner"
        style={{ marginBottom: 16 }}
      />

      {/* Список компаний */}
      <div style={{ marginBottom: 16 }}>
        {filteredCompanies.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
            Компании не найдены
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <div
              key={company.id}
              style={{
                background: 'var(--bg-card-owner-alt)',
                border: '1px solid var(--border-card-owner)',
                borderRadius: 'var(--radius-card-sm)',
                padding: 12,
                marginBottom: 12,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Информация компании */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {company.organization_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  ID: {company.telegram_id}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📍 {company.city} • {company.phone} • Зарегистрирована: {company.created_at}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: company.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                      color: company.status === 'active' ? '#16A34A' : '#DC2626',
                      fontWeight: 600,
                    }}
                  >
                    {company.status === 'active' ? '✅ Активна' : '🚫 Заблокирована'}
                  </div>
                  {complaints[company.id]?.length > 0 && (
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
                      ⚠️ Жалоб: {complaints[company.id].length}
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
                  onClick={() => handleWarnCompany(company.id)}
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
                  onClick={() => loadComplaints(company.id)}
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
                  📋 Жалобы ({complaints[company.id]?.length || 0})
                </button>

                <button
                  onClick={() => handleBlockCompany(company.id)}
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
      {showComplaintsModal && selectedCompany && (
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
              📋 Жалобы на {selectedCompany.organization_name}
            </div>

            {complaintsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Загрузка...
              </div>
            ) : complaints[selectedCompany.id]?.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Нет жалоб на эту компанию
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {complaints[selectedCompany.id]?.map((complaint) => (
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
      {showBlockModal && selectedCompany && (
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
              🚫 Блокировка компании
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Блокировать {selectedCompany.organization_name}?
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
