// ⚠️ ВРЕМЕННАЯ ЗАГЛУШКА С ДЕМО-ДАННЫМИ.
// Ветка ссылалась на этот экран, но файла в репозитории не было — без него сборка падала.
// Бэкенда (owner-shifts-history / freelancer-shifts-history) не существует.
// В main есть готовые OwnerMyShiftsScreen и FreelancerMyShiftsScreen на реальных данных —
// при сведении веток заменить этот экран на них, а файл удалить.

import { useState, useEffect } from 'react';
import { callFunction, ApiError } from '../../lib/api';
import { Screen, ScreenHeader, Card, Loading, EmptyState, ErrorText } from '../../components/ui';

interface ShiftRecord {
  id: string;
  company_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'completed' | 'cancelled' | 'no_show';
  payment: number;
  vacancy_address?: string;
  rating?: number;
}

const MOCK_SHIFTS: ShiftRecord[] = [
  {
    id: 'fl-shift-1',
    company_name: 'ПВЗ Логистика',
    date: '2024-07-25',
    start_time: '09:00',
    end_time: '18:00',
    status: 'completed',
    payment: 8000,
    vacancy_address: 'ул. Тверская, 15',
    rating: 5,
  },
  {
    id: 'fl-shift-2',
    company_name: 'СортировкаПро',
    date: '2024-07-24',
    start_time: '10:00',
    end_time: '19:00',
    status: 'completed',
    payment: 9000,
    vacancy_address: 'ул. Охотный ряд, 2',
    rating: 4.5,
  },
];

export const ShiftsHistoryScreen = ({ onBack }: { onBack: () => void }) => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = import.meta.env.DEV
        ? { shifts: MOCK_SHIFTS }
        : await callFunction<{ shifts: ShiftRecord[] }>('freelancer-shifts-history', {});

      setShifts(data.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts history:', err);
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '✅ Выполнена',
      cancelled: '❌ Отменена',
      no_show: '⚠️ Не явился',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: '#10b981',
      cancelled: '#ef4444',
      no_show: '#f59e0b',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <Screen>
      <ScreenHeader title="История смен" variant="freelancer" onBack={onBack} />

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <Loading />}
      {!loading && shifts.length === 0 && <EmptyState>История смен пуста</EmptyState>}

      {!loading &&
        shifts.map((shift) => (
          <Card key={shift.id} variant="freelancer">
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
              {shift.company_name}
            </div>
            <div className="meta">📅 {shift.date}</div>
            <div className="meta">⏰ {shift.start_time} - {shift.end_time}</div>
            {shift.vacancy_address && <div className="meta">📍 {shift.vacancy_address}</div>}
            <div className="meta" style={{ marginBottom: 10 }}>
              💰 {shift.payment} ₽
            </div>
            {shift.rating && <div className="meta">⭐ Оценка: {shift.rating}</div>}
            <div style={{ color: getStatusColor(shift.status), fontWeight: 600, fontSize: 12 }}>
              {getStatusLabel(shift.status)}
            </div>
          </Card>
        ))}
    </Screen>
  );
};
