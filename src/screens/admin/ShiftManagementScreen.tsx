import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Shift {
  id: string;
  status: string;
  created_at: string;
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
  { value: 'accepted', label: 'Подтверждённые' },
  { value: 'pending', label: 'Ожидают ответа' },
  { value: 'cancelled', label: 'Отменённые' },
  { value: 'all', label: 'Все' },
] as const;

const STATUS_LABELS: Record<string, { text: string; bg: string; color: string }> = {
  accepted: { text: '✅ Принята', bg: '#DCFCE7', color: '#16A34A' },
  pending: { text: '⏳ Ожидает', bg: '#FEF3C7', color: '#D97706' },
  rejected: { text: '❌ Отклонена', bg: '#FEE2E2', color: '#DC2626' },
  cancelled: { text: '🚫 Отменена', bg: '#FEE2E2', color: '#DC2626' },
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ru') : null;

const formatTime = (value?: string | null) => (value ? value.slice(0, 5) : null);

export const ShiftManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('accepted');

  const loadShifts = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ shifts: Shift[] }>('moderation-service', {
        action: 'list_shifts',
        status,
        limit: 100,
      });
      setShifts(data.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить смены');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts(filter);
  }, [filter, loadShifts]);

  const handleCancel = async (shift: Shift) => {
    const reason = prompt('Причина отмены смены:');
    if (!reason?.trim()) return;

    setBusyId(shift.id);
    try {
      await callFunction('moderation-service', {
        action: 'cancel_shift',
        shiftId: shift.id,
        reason: reason.trim(),
      });
      await loadShifts(filter);
    } catch (err) {
      console.error('Error cancelling shift:', err);
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось отменить смену'}`);
    } finally {
      setBusyId(null);
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
      <div className="title">📅 Смены</div>
      <div className="subtitle">Кто, где и когда выходит</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              ...actionButton,
              background: filter === f.value ? 'var(--accent-owner)' : 'white',
              color: filter === f.value ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-card-owner)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626' }}>
          ❌ {error}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => loadShifts(filter)}
              style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {!loading && !error && shifts.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          Смен не найдено
        </div>
      )}

      {!loading &&
        !error &&
        shifts.map((shift) => {
          const badge = STATUS_LABELS[shift.status] || {
            text: shift.status,
            bg: '#F3F4F6',
            color: '#6B7280',
          };
          const day = formatDate(shift.date);
          const from = formatTime(shift.start_time);
          const to = formatTime(shift.end_time);

          return (
            <div
              key={shift.id}
              style={{
                background: 'var(--bg-card-owner-alt)',
                border: '1px solid var(--border-card-owner)',
                borderRadius: 'var(--radius-card-sm)',
                padding: 12,
                marginBottom: 12,
                boxShadow: 'var(--shadow-card)',
                opacity: busyId === shift.id ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {shift.address || 'Адрес не указан'}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                👷 Сотрудник: {shift.freelancer_name || '—'} (ID: {shift.freelancer_telegram_id})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                🏢 ПВЗ: {shift.owner_name || '—'} (ID: {shift.owner_telegram_id})
              </div>

              {(day || from) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  📅 {day || 'без даты'}
                  {from && to ? ` • ⏰ ${from}–${to}` : ''}
                </div>
              )}

              {shift.payment != null && (
                <div className="price owner" style={{ marginTop: 4 }}>
                  💰 {shift.payment} ₽
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: badge.bg,
                    color: badge.color,
                    fontWeight: 600,
                  }}
                >
                  {badge.text}
                </div>
                {shift.status === 'accepted' && (
                  <div
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: shift.confirmed_at ? '#DCFCE7' : '#FEF3C7',
                      color: shift.confirmed_at ? '#16A34A' : '#D97706',
                      fontWeight: 600,
                    }}
                  >
                    {shift.confirmed_at ? '👍 Выход подтверждён' : '❔ Выход не подтверждён'}
                  </div>
                )}
              </div>

              {shift.status !== 'cancelled' && (
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => handleCancel(shift)}
                    disabled={busyId === shift.id}
                    style={{ ...actionButton, background: '#FEE2E2', color: '#DC2626' }}
                  >
                    🚫 Отменить смену
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </Screen>
  );
};
