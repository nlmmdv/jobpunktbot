import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';
import { pluralWith } from '../../lib/utils';

interface Incident {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
  resolved_at: string | null;
  subject_name: string | null;
  subject_telegram_id: number;
  reporter_name: string | null;
  address: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  payment: number | null;
}

const FILTERS = [
  { value: 'open', label: 'На разборе' },
  { value: 'resolved', label: 'Подтверждённые' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'all', label: 'Все' },
] as const;

const STATUS: Record<string, { text: string; bg: string; color: string }> = {
  open: { text: '🔔 Ждёт разбора', bg: '#FEF3C7', color: '#D97706' },
  resolved: { text: '✅ Неявка подтверждена', bg: '#FEE2E2', color: '#DC2626' },
  rejected: { text: '↩️ Отклонена', bg: '#DCFCE7', color: '#16A34A' },
};

const when = (v?: string | null) =>
  v ? new Date(v).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ru') : null);
const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : null);

/**
 * Неявки, заявленные владельцами. Каждая привязана к конкретной смене, поэтому
 * модератор видит контекст и решает: засчитать срыв или отклонить, если
 * владелец ошибся.
 */
export const IncidentsScreen = ({ onBack }: { onBack: () => void }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<string>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ incidents: Incident[] }>('moderation-service', {
        action: 'list_incidents',
        status,
      });
      setIncidents(data.incidents || []);
    } catch (err) {
      console.error('Не удалось загрузить неявки:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить неявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const resolve = async (incident: Incident, rejected: boolean) => {
    const question = rejected
      ? 'Почему отклоняем? (владелец ошибся, сотрудник был на месте)'
      : 'Комментарий к разбору (необязательно):';
    const reason = prompt(question);
    // Отклонение требует объяснения — оно снимает обвинение с сотрудника.
    if (rejected && !reason?.trim()) return;
    if (reason === null) return;

    setBusyId(incident.id);
    try {
      await callFunction('moderation-service', {
        action: 'resolve_incident',
        incidentId: incident.id,
        rejected,
        reason: reason.trim() || undefined,
      });
      await load(filter);
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось закрыть неявку'}`);
    } finally {
      setBusyId(null);
    }
  };

  const btn = {
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--border-card-owner, #E5E7EB)',
  } as const;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🚫 Неявки</div>
      <div className="subtitle">
        Заявлены владельцами · {pluralWith(incidents.length, ['запись', 'записи', 'записей'])}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              ...btn,
              background: filter === f.value ? 'var(--accent-owner, #2563EB)' : 'white',
              color: filter === f.value ? 'white' : 'var(--text-primary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>❌ {error}</div>
      )}

      {!loading && !error && incidents.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          {filter === 'open' ? 'Неразобранных неявок нет' : 'Записей нет'}
        </div>
      )}

      {!loading &&
        !error &&
        incidents.map((incident) => {
          const badge = STATUS[incident.status] || { text: incident.status, bg: '#F3F4F6', color: '#6B7280' };
          const d = day(incident.date);
          const from = hhmm(incident.start_time);
          const to = hhmm(incident.end_time);

          return (
            <div
              key={incident.id}
              style={{
                background: 'var(--bg-card-owner-alt, #F9FAFB)',
                border: `1px solid ${incident.status === 'open' ? '#FCD34D' : 'var(--border-card-owner, #E5E7EB)'}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                opacity: busyId === incident.id ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {incident.subject_name || 'Сотрудник'} не вышел
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                📍 {incident.address || 'адрес не указан'}
              </div>
              {(d || from) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📅 {d || 'без даты'}
                  {from && to ? ` · ⏰ ${from}–${to}` : ''}
                  {incident.payment != null ? ` · 💰 ${incident.payment} ₽` : ''}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                🏢 Заявил: {incident.reporter_name || 'владелец'} · {when(incident.created_at)}
              </div>

              {incident.description && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    fontStyle: 'italic',
                    marginTop: 8,
                    padding: 8,
                    background: 'white',
                    borderRadius: 8,
                  }}
                >
                  «{incident.description}»
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontWeight: 600,
                    background: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.text}
                </span>
              </div>

              {incident.status === 'open' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => resolve(incident, false)}
                    disabled={busyId === incident.id}
                    style={{ ...btn, background: '#FEE2E2', color: '#DC2626', border: 'none' }}
                  >
                    ✅ Неявка подтверждена
                  </button>
                  <button
                    onClick={() => resolve(incident, true)}
                    disabled={busyId === incident.id}
                    style={{ ...btn, background: '#DCFCE7', color: '#16A34A', border: 'none' }}
                  >
                    ↩️ Отклонить
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </Screen>
  );
};
