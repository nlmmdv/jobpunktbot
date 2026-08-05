import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Shift {
  id: string;
  status: string;
  confirmed_at: string | null;
  owner_telegram_id: number;
  freelancer_telegram_id: number;
  owner_name: string | null;
  freelancer_name: string | null;
  address: string | null;
  payment: number | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
}

const FILTERS = [
  { value: 'accepted', label: 'Принятые' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'cancelled', label: 'Отменённые' },
  { value: 'all', label: 'Все' },
] as const;

const STATUS: Record<string, { text: string; bg: string; color: string }> = {
  accepted: { text: '✅ Принята', bg: '#DCFCE7', color: '#16A34A' },
  pending: { text: '⏳ Ожидает', bg: '#FEF3C7', color: '#D97706' },
  rejected: { text: '❌ Отклонена', bg: '#FEE2E2', color: '#DC2626' },
  cancelled: { text: '🚫 Отменена', bg: '#FEE2E2', color: '#DC2626' },
};

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ru') : null);
const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : null);

export const ShiftsScreen = ({ onBack }: { onBack: () => void }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filter, setFilter] = useState<string>('accepted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ shifts: Shift[] }>('moderation-service', {
        action: 'list_shifts',
        status,
      });
      setShifts(data.shifts || []);
    } catch (err) {
      console.error('Не удалось загрузить смены:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить смены');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const cancelShift = async (shift: Shift) => {
    const reason = prompt('Причина отмены смены:');
    if (!reason?.trim()) return;

    setBusyId(shift.id);
    try {
      await callFunction('moderation-service', {
        action: 'cancel_shift',
        shiftId: shift.id,
        reason: reason.trim(),
      });
      await load(filter);
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось отменить смену'}`);
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
      <div className="title">📅 Смены</div>
      <div className="subtitle">Кто, где и когда выходит · найдено: {shifts.length}</div>

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

      {!loading && !error && shifts.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          Смен не найдено
        </div>
      )}

      {!loading &&
        !error &&
        shifts.map((shift) => {
          const badge = STATUS[shift.status] || { text: shift.status, bg: '#F3F4F6', color: '#6B7280' };
          const d = day(shift.date);
          const from = hhmm(shift.start_time);
          const to = hhmm(shift.end_time);

          return (
            <div
              key={shift.id}
              style={{
                background: 'var(--bg-card-owner-alt, #F9FAFB)',
                border: '1px solid var(--border-card-owner, #E5E7EB)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                opacity: busyId === shift.id ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {shift.address || 'Адрес не указан'}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                👷 {shift.freelancer_name || '—'} (ID {shift.freelancer_telegram_id})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                🏢 {shift.owner_name || '—'} (ID {shift.owner_telegram_id})
              </div>

              {(d || from) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📅 {d || 'без даты'}
                  {from && to ? ` · ⏰ ${from}–${to}` : ''}
                </div>
              )}

              {shift.payment != null && (
                <div className="price owner" style={{ marginTop: 4 }}>
                  💰 {shift.payment} ₽
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                {shift.status === 'accepted' && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontWeight: 600,
                      background: shift.confirmed_at ? '#DCFCE7' : '#FEF3C7',
                      color: shift.confirmed_at ? '#16A34A' : '#D97706',
                    }}
                  >
                    {shift.confirmed_at ? '👍 Выход подтверждён' : '❔ Выход не подтверждён'}
                  </span>
                )}
              </div>

              {shift.status !== 'cancelled' && (
                <button
                  onClick={() => cancelShift(shift)}
                  disabled={busyId === shift.id}
                  style={{ ...btn, background: '#FEE2E2', color: '#DC2626', border: 'none', marginTop: 10 }}
                >
                  🚫 Отменить смену
                </button>
              )}
            </div>
          );
        })}
    </Screen>
  );
};
