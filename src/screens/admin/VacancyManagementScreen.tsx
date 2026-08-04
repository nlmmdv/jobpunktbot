import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Vacancy {
  id: string;
  address?: string;
  description?: string;
  payment?: number;
  telegram_id: number;
  first_name?: string | null;
  created_at: string;
  has_spam: boolean;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ru') : '—';

export const VacancyManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlySpam, setOnlySpam] = useState(false);

  const loadVacancies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ vacancies: Vacancy[] }>('moderation-service', {
        action: 'vacancies_for_review',
        limit: 100,
      });
      setVacancies(data.vacancies || []);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить вакансии');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVacancies();
  }, [loadVacancies]);

  const handleRemove = async (vacancy: Vacancy) => {
    const reason = prompt('Причина снятия вакансии:');
    if (!reason?.trim()) return;

    setBusyId(vacancy.id);
    try {
      await callFunction('moderation-service', {
        action: 'delete_vacancy',
        vacancyId: vacancy.id,
        reason: reason.trim(),
      });
      setVacancies((prev) => prev.filter((v) => v.id !== vacancy.id));
    } catch (err) {
      console.error('Error removing vacancy:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось снять вакансию'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (vacancy: Vacancy) => {
    setBusyId(vacancy.id);
    try {
      await callFunction('moderation-service', {
        action: 'approve_vacancy',
        vacancyId: vacancy.id,
      });
      // Вакансия остаётся опубликованной — просто убираем её из очереди проверки.
      setVacancies((prev) => prev.filter((v) => v.id !== vacancy.id));
    } catch (err) {
      console.error('Error approving vacancy:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось одобрить вакансию'}`);
    } finally {
      setBusyId(null);
    }
  };

  const visible = onlySpam ? vacancies.filter((v) => v.has_spam) : vacancies;
  const spamCount = vacancies.filter((v) => v.has_spam).length;

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
      <div className="title">📋 Управление вакансиями</div>
      <div className="subtitle">Проверка опубликованных вакансий на спам</div>

      {!loading && !error && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setOnlySpam(false)}
            style={{
              ...actionButton,
              background: onlySpam ? 'white' : 'var(--accent-owner)',
              color: onlySpam ? 'var(--text-primary)' : 'white',
              border: '1px solid var(--border-card-owner)',
            }}
          >
            Все ({vacancies.length})
          </button>
          <button
            onClick={() => setOnlySpam(true)}
            style={{
              ...actionButton,
              background: onlySpam ? '#DC2626' : 'white',
              color: onlySpam ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-card-owner)',
            }}
          >
            ⚠️ Подозрительные ({spamCount})
          </button>
        </div>
      )}

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626' }}>
          ❌ {error}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={loadVacancies}
              style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          {onlySpam ? 'Подозрительных вакансий нет' : 'Вакансий на проверку нет'}
        </div>
      )}

      {!loading &&
        !error &&
        visible.map((vacancy) => (
          <div
            key={vacancy.id}
            style={{
              background: 'var(--bg-card-owner-alt)',
              border: `1px solid ${vacancy.has_spam ? '#FCA5A5' : 'var(--border-card-owner)'}`,
              borderRadius: 'var(--radius-card-sm)',
              padding: 12,
              marginBottom: 12,
              boxShadow: 'var(--shadow-card)',
              opacity: busyId === vacancy.id ? 0.6 : 1,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {vacancy.address || 'Без адреса'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              👤 {vacancy.first_name || 'Неизвестно'} (ID: {vacancy.telegram_id}) •{' '}
              {formatDate(vacancy.created_at)}
            </div>
            {vacancy.payment != null && (
              <div className="price owner" style={{ marginTop: 4 }}>
                💰 {vacancy.payment} ₽
              </div>
            )}

            {vacancy.description && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                {vacancy.description}
              </div>
            )}

            {vacancy.has_spam && (
              <div
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: '#FEE2E2',
                  color: '#DC2626',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginTop: 8,
                }}
              >
                ⚠️ Возможен спам: контакты в описании
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                onClick={() => handleApprove(vacancy)}
                disabled={busyId === vacancy.id}
                style={{ ...actionButton, background: '#DCFCE7', color: '#16A34A' }}
              >
                ✅ Одобрить
              </button>
              <button
                onClick={() => handleRemove(vacancy)}
                disabled={busyId === vacancy.id}
                style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
              >
                🚫 Снять с публикации
              </button>
            </div>
          </div>
        ))}
    </Screen>
  );
};
