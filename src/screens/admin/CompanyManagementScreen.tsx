import { useState, useEffect, useCallback } from 'react';
import { Screen, TextField, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Block {
  id: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

interface Company {
  id: string;
  telegram_id: number;
  organization_name: string;
  phone?: string;
  city?: string;
  status: string;
  created_at: string;
  is_blocked: boolean;
  block: Block | null;
  warning_count: number;
  open_complaints: number;
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

// Значения — длительность блокировки в минутах, 0 — бессрочно.
const DURATIONS = [
  { value: 60, label: '1 час' },
  { value: 24 * 60, label: '1 день' },
  { value: 7 * 24 * 60, label: '1 неделя' },
];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ru') : '—';

export const CompanyManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<'temporary' | 'permanent'>('temporary');
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  const loadCompanies = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ companies: Company[] }>('moderation-service', {
        action: 'list_companies',
        search: search.trim() || undefined,
        limit: 100,
      });
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить компании');
    } finally {
      setLoading(false);
    }
  }, []);

  // Поиск идёт на сервере — ждём паузу в наборе, чтобы не слать запрос на каждый символ.
  useEffect(() => {
    const timer = setTimeout(() => loadCompanies(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, loadCompanies]);

  const openBlockModal = (companyId: string, type: 'temporary' | 'permanent') => {
    setSelectedCompanyId(companyId);
    setBlockType(type);
    setBlockDuration(60);
    setBlockReason('');
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    if (!selectedCompany) return;
    const reason = blockReason.trim();
    if (!reason) {
      alert('Укажите причину блокировки');
      return;
    }

    setBusyId(selectedCompany.id);
    try {
      await callFunction('moderation-service', {
        action: 'block_company',
        ownerId: selectedCompany.id,
        durationMinutes: blockType === 'temporary' ? blockDuration : 0,
        reason,
      });
      setShowBlockModal(false);
      await loadCompanies(searchQuery);
    } catch (err) {
      console.error('Error blocking company:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Ошибка при блокировке'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnblock = async (company: Company) => {
    if (!confirm(`Снять блокировку с «${company.organization_name}»?`)) return;

    setBusyId(company.id);
    try {
      await callFunction('moderation-service', {
        action: 'unblock_company',
        ownerId: company.id,
      });
      await loadCompanies(searchQuery);
    } catch (err) {
      console.error('Error unblocking company:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Ошибка при разблокировке'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleWarn = async (company: Company) => {
    const reason = prompt(`Причина предупреждения для «${company.organization_name}»:`);
    if (!reason?.trim()) return;

    setBusyId(company.id);
    try {
      const result = await callFunction<{ warning_count: number; auto_blocked: boolean }>(
        'moderation-service',
        {
          action: 'warn_company',
          ownerId: company.id,
          reason: reason.trim(),
          severity: 'mild',
        }
      );
      alert(
        result.auto_blocked
          ? `⚠️ Предупреждение #${result.warning_count}. Компания автоматически заблокирована на 7 дней.`
          : `⚠️ Предупреждение #${result.warning_count} выдано`
      );
      await loadCompanies(searchQuery);
    } catch (err) {
      console.error('Error warning company:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Ошибка при выдаче предупреждения'}`);
    } finally {
      setBusyId(null);
    }
  };

  const openComplaints = async (company: Company) => {
    setSelectedCompanyId(company.id);
    setShowComplaintsModal(true);
    setComplaintsLoading(true);
    setComplaints([]);
    try {
      const data = await callFunction<{ complaints: Complaint[] }>('moderation-service', {
        action: 'company_complaints',
        ownerId: company.id,
      });
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось загрузить жалобы'}`);
      setShowComplaintsModal(false);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const resolveComplaint = async (complaintId: string) => {
    try {
      await callFunction('moderation-service', {
        action: 'resolve_complaint',
        subjectType: 'company',
        complaintId,
      });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: 'resolved' } : c))
      );
      await loadCompanies(searchQuery);
    } catch (err) {
      console.error('Error resolving complaint:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось закрыть жалобу'}`);
    }
  };

  const actionButton = {
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  } as const;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🏢 Управление компаниями</div>
      <div className="subtitle">Модерация ПВЗ и действия с компаниями</div>

      <TextField
        placeholder="Поиск по названию, городу или ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        variant="owner"
        style={{ marginBottom: 16 }}
      />

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626' }}>
          ❌ {error}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => loadCompanies(searchQuery)}
              style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {!loading && !error && companies.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          Компании не найдены
        </div>
      )}

      {!loading &&
        !error &&
        companies.map((company) => (
          <div
            key={company.id}
            style={{
              background: 'var(--bg-card-owner-alt)',
              border: '1px solid var(--border-card-owner)',
              borderRadius: 'var(--radius-card-sm)',
              padding: 12,
              marginBottom: 12,
              boxShadow: 'var(--shadow-card)',
              opacity: busyId === company.id ? 0.6 : 1,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {company.organization_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                ID: {company.telegram_id}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                📍 {company.city || '—'} • {company.phone || '—'} • Зарегистрирована:{' '}
                {formatDate(company.created_at)}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: company.is_blocked ? '#FEE2E2' : '#DCFCE7',
                    color: company.is_blocked ? '#DC2626' : '#16A34A',
                    fontWeight: 600,
                  }}
                >
                  {company.is_blocked ? '🚫 Заблокирована' : '✅ Активна'}
                </div>

                {company.warning_count > 0 && (
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
                    ⚠️ Предупреждений: {company.warning_count}
                  </div>
                )}

                {company.open_complaints > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: '#FEE2E2',
                      color: '#DC2626',
                      fontWeight: 600,
                    }}
                  >
                    📋 Жалоб: {company.open_complaints}
                  </div>
                )}
              </div>

              {company.is_blocked && company.block && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>
                  Причина: {company.block.reason} • До:{' '}
                  {company.block.expires_at ? formatDate(company.block.expires_at) : 'бессрочно'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleWarn(company)}
                disabled={busyId === company.id}
                style={{
                  ...actionButton,
                  border: '1px solid var(--border-card-owner)',
                  background: 'white',
                  color: 'var(--accent-owner)',
                }}
              >
                ⚠️ Предупреждение
              </button>

              <button
                onClick={() => openComplaints(company)}
                disabled={busyId === company.id}
                style={{
                  ...actionButton,
                  border: '1px solid var(--border-card-owner)',
                  background: 'white',
                  color: 'var(--text-primary)',
                }}
              >
                📋 Жалобы{company.open_complaints > 0 ? ` (${company.open_complaints})` : ''}
              </button>

              {company.is_blocked ? (
                <button
                  onClick={() => handleUnblock(company)}
                  disabled={busyId === company.id}
                  style={{ ...actionButton, background: '#DCFCE7', color: '#16A34A' }}
                >
                  ✅ Разблокировать
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openBlockModal(company.id, 'temporary')}
                    disabled={busyId === company.id}
                    style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
                  >
                    ⏱️ Временная блокировка
                  </button>
                  <button
                    onClick={() => openBlockModal(company.id, 'permanent')}
                    disabled={busyId === company.id}
                    style={{ ...actionButton, background: '#991B1B', color: 'white' }}
                  >
                    🚫 Заблокировать
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

      {/* Модальное окно блокировки */}
      {showBlockModal && selectedCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowBlockModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 320,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              {blockType === 'temporary' ? '⏱️ Временная блокировка' : '🚫 Постоянная блокировка'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {blockType === 'temporary'
                ? `Временно заблокировать «${selectedCompany.organization_name}»?`
                : `Заблокировать «${selectedCompany.organization_name}» бессрочно?`}
            </div>

            {blockType === 'temporary' && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Продолжительность:
                </label>
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(Number(e.target.value))}
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
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Причина:
              </label>
              <input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Например: спам в вакансиях"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card-owner)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmBlock}
                disabled={busyId === selectedCompany.id}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: 'none',
                  background: blockType === 'temporary' ? '#DC2626' : '#991B1B',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {busyId === selectedCompany.id ? 'Сохраняем...' : 'Заблокировать'}
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
                style={{
                  flex: 1,
                  padding: 10,
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

      {/* Модальное окно жалоб */}
      {showComplaintsModal && selectedCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowComplaintsModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              maxWidth: 400,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              📋 Жалобы на {selectedCompany.organization_name}
            </div>

            {complaintsLoading ? (
              <Loading />
            ) : complaints.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Жалоб нет
              </div>
            ) : (
              complaints.map((complaint) => (
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Пожаловался: {complaint.reported_by.first_name} {complaint.reported_by.last_name || ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    ID: {complaint.reported_by.telegram_id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Причина: <strong>{complaint.reason}</strong>
                  </div>
                  {complaint.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                        fontStyle: 'italic',
                      }}
                    >
                      «{complaint.description}»
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#6B7280' }}>{formatDate(complaint.created_at)}</div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <div
                      style={{
                        fontSize: 10,
                        padding: '3px 6px',
                        borderRadius: 4,
                        background: complaint.status === 'open' ? '#FEF3C7' : '#DCFCE7',
                        color: complaint.status === 'open' ? '#D97706' : '#16A34A',
                        fontWeight: 600,
                      }}
                    >
                      {complaint.status === 'open' ? '🔔 Открыта' : '✅ Закрыта'}
                    </div>
                    {complaint.status === 'open' && (
                      <button
                        onClick={() => resolveComplaint(complaint.id)}
                        style={{ ...actionButton, background: '#DCFCE7', color: '#16A34A', padding: '4px 8px' }}
                      >
                        Закрыть
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() => setShowComplaintsModal(false)}
              style={{
                width: '100%',
                padding: 10,
                marginTop: 8,
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
      )}
    </Screen>
  );
};
