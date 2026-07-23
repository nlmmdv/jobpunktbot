import { useState, useMemo, useEffect } from 'react';
import { Screen, TextField, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Company {
  id: string;
  telegram_id: number;
  organization_name: string;
  phone?: string;
  city?: string;
  status: string;
  created_at: string;
  owner_name?: string;
  owner_id?: string;
}

export const CompanyManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<'temporary' | 'permanent'>('temporary');
  const [blockDuration, setBlockDuration] = useState('1');
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ companies: Company[] }>('list-companies', {
        limit: 100,
      });
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

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

  // Временная или постоянная блокировка компании
  const handleBlockCompany = (companyId: string, type: 'temporary' | 'permanent') => {
    setSelectedCompanyId(companyId);
    setBlockType(type);
    setShowBlockModal(true);
  };

  // Пометить компанию заблокированной в локальном списке, чтобы бейдж
  // «Активна» сразу сменился на «Заблокирована» без перезагрузки.
  const markCompanyBlocked = (companyId: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, status: 'blocked' } : c))
    );
  };

  const confirmBlock = async () => {
    if (!selectedCompanyId) return;
    const companyId = selectedCompanyId;
    const companyName = selectedCompany?.organization_name;

    const durationText =
      blockDuration === '1' ? 'час' : blockDuration === '24' ? 'день' : 'неделю';

    try {
      // В DEV режиме обновляем только локальное состояние
      if (!import.meta.env.DEV) {
        await callFunction<{ block: { id: string } }>('block-company', {
          owner_id: companyId,
          duration_minutes: blockType === 'temporary' ? 60 : 0,
          reason:
            blockType === 'temporary'
              ? 'Временная блокировка администратором'
              : 'Полная постоянная блокировка администратором',
        });
      }

      markCompanyBlocked(companyId);
      alert(
        blockType === 'temporary'
          ? `✅ ${companyName} заблокирована на ${durationText}`
          : `✅ ${companyName} перманентно заблокирована`
      );
      setShowBlockModal(false);
    } catch (err) {
      console.error('Error blocking:', err);
      alert(`❌ Ошибка при блокировке: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Предупреждение компании
  const handleWarnCompany = async (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    try {
      const result = await callFunction<{
        warning: { id: string };
        auto_blocked: boolean;
      }>('warn-company', {
        owner_id: companyId,
        reason: 'Предупреждение администратором',
        severity: 'mild',
      });

      alert(
        `⚠️ Компания ${company?.organization_name} получила предупреждение`
      );
    } catch (err) {
      console.error('Error warning company:', err);
      alert(`❌ Ошибка при отправке предупреждения: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };


  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🏢 Управление компаниями</div>
      <div className="subtitle">Модерация ПВЗ и действия с компаниями</div>

      {loading ? (
        <Loading />
      ) : error ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#DC2626' }}>
          ❌ {error}
        </div>
      ) : (
        <>
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

                {company.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleBlockCompany(company.id, 'temporary')}
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
                      ⏱️ Временная блокировка
                    </button>

                    <button
                      onClick={() => handleBlockCompany(company.id, 'permanent')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#991B1B',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLButtonElement).style.background = '#7F1D1D';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLButtonElement).style.background = '#991B1B';
                      }}
                    >
                      🚫 Заблокировать
                    </button>
                  </>
                )}
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
        </>
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
              {blockType === 'temporary' ? '⏱️ Временная блокировка' : '🚫 Постоянная блокировка'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {blockType === 'temporary'
                ? `Временно заблокировать ${selectedCompany.organization_name}?`
                : `Перманентно заблокировать ${selectedCompany.organization_name}? Это действие нельзя отменить.`}
            </div>

            {blockType === 'temporary' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  Выберите продолжительность:
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
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmBlock}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: 'none',
                  background: blockType === 'temporary' ? '#DC2626' : '#991B1B',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {blockType === 'temporary' ? 'Заблокировать' : 'Перманентно заблокировать'}
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
