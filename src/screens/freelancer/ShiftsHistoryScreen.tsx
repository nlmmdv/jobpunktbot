import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, SectionTitle, Loading, Modal, TextField } from '../../components/ui';

interface CompletedShift {
  id: string;
  company_name: string;
  location_address: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  date: string;
  status: 'completed' | 'cancelled';
  owner_name: string;
  owner_id: string;
  owner_telegram_username?: string;
  total_hours: number;
  total_earnings: number;
}

// Данные-заглушки для локальной разработки (DEV), когда Edge Functions недоступны.
const MOCK_HISTORY: CompletedShift[] = [
  {
    id: 'shift-1',
    company_name: 'ПВЗ Тверская',
    location_address: 'ул. Тверская, 5, Москва',
    start_time: '09:00',
    end_time: '18:00',
    hourly_rate: 500,
    date: '2024-07-20',
    status: 'completed',
    owner_name: 'Петр Владелец',
    owner_id: 'owner-1',
    owner_telegram_username: 'pvz_owner',
    total_hours: 9,
    total_earnings: 4500,
  },
  {
    id: 'shift-2',
    company_name: 'ПВЗ Невский',
    location_address: 'Невский пр., 100, СПб',
    start_time: '10:00',
    end_time: '19:00',
    hourly_rate: 450,
    date: '2024-07-19',
    status: 'completed',
    owner_name: 'Иван Петров',
    owner_id: 'owner-2',
    owner_telegram_username: 'ivan_pvz',
    total_hours: 9,
    total_earnings: 4050,
  },
  {
    id: 'shift-3',
    company_name: 'ПВЗ Красные Ворота',
    location_address: 'пл. Красных Ворот, 1, Москва',
    start_time: '08:00',
    end_time: '17:00',
    hourly_rate: 550,
    date: '2024-07-18',
    status: 'cancelled',
    owner_name: 'Мария Сидорова',
    owner_id: 'owner-3',
    total_hours: 0,
    total_earnings: 0,
  },
];

export const ShiftsHistoryScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<CompletedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<CompletedShift | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // DEV MODE: история смен-заглушка, без обращения к бэкенду.
      if (import.meta.env.DEV) {
        setShifts(MOCK_HISTORY);
        setLoading(false);
        return;
      }

      if (!profile?.id) throw new Error('No profile');
      const data = await callFunction<{ shifts: CompletedShift[] }>('shifts-history', {
        user_id: profile.id,
        user_type: 'freelancer',
      });
      setShifts(data.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedShift || !profile?.id) return;
    setSubmitting(true);
    try {
      await callFunction('submit-review', {
        reviewer_id: profile.id,
        reviewed_id: selectedShift.owner_id,
        rating: rating,
        comment: comment.trim() || undefined,
        reviewed_type: 'owner',
      });
      setSelectedShift(null);
      setRating(5);
      setComment('');
      // Refresh shifts
      loadHistory();
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('Ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="История смен" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="История смен" variant="freelancer" onBack={onBack} />

      {shifts.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 14 }}>У вас еще нет завершённых смен</div>
        </div>
      ) : (
        <>
          <SectionTitle>Завершённые смены ({shifts.filter(s => s.status === 'completed').length})</SectionTitle>
          {shifts.filter(s => s.status === 'completed').map((shift) => (
            <Card key={shift.id} variant="freelancer">
              <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 6 }}>
                📍 {shift.company_name}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{shift.location_address}</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                📅 {new Date(shift.date).toLocaleDateString('ru')} • {shift.start_time}-{shift.end_time}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Ставка: {shift.hourly_rate} ₽/час</div>
                  <div className="price freelancer" style={{ margin: '6px 0' }}>
                    {shift.total_hours}ч × {shift.hourly_rate} = {shift.total_earnings} ₽
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Владелец: <strong>{shift.owner_name}</strong>
              </div>
              <Button tone="primary" small onClick={() => setSelectedShift(shift)} style={{ marginBottom: 6 }}>
                ⭐ Оценить
              </Button>
              {shift.owner_telegram_username && (
                <Button
                  tone="secondary"
                  small
                  onClick={() => window.open(`https://t.me/${shift.owner_telegram_username}`, '_blank')}
                >
                  💬 Написать
                </Button>
              )}
            </Card>
          ))}

          {shifts.filter(s => s.status === 'cancelled').length > 0 && (
            <>
              <SectionTitle>Отменённые смены</SectionTitle>
              {shifts.filter(s => s.status === 'cancelled').map((shift) => (
                <Card key={shift.id} variant="freelancer" style={{ opacity: 0.6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 6 }}>
                    📍 {shift.company_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{shift.location_address}</div>
                  <div style={{ fontSize: 13, color: '#999' }}>
                    📅 {new Date(shift.date).toLocaleDateString('ru')} — Отменена
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {selectedShift && (
        <Modal title="Оценить работу" onClose={() => { setSelectedShift(null); setRating(5); setComment(''); }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              Оценить: <strong>{selectedShift.owner_name}</strong>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Оценка</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      fontSize: 28,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: star <= rating ? 1 : 0.3,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#666', marginTop: 8 }}>
                {rating} из 5
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Комментарий (необязательно)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Поделитесь впечатлениями о работе..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  minHeight: 80,
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmitReview}
            disabled={submitting}
            style={{ marginBottom: 8 }}
          >
            {submitting ? 'Отправка...' : '✅ Отправить отзыв'}
          </Button>
          <Button tone="secondary" onClick={() => { setSelectedShift(null); setRating(5); setComment(''); }}>
            Отмена
          </Button>
        </Modal>
      )}
    </Screen>
  );
};
