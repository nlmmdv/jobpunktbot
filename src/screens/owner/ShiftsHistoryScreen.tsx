import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, SectionTitle, Loading, Modal } from '../../components/ui';

interface CompletedShift {
  id: string;
  freelancer_name: string;
  freelancer_id: string;
  freelancer_telegram_username?: string;
  location_address: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  date: string;
  status: 'completed' | 'cancelled';
  total_hours: number;
  total_cost: number;
  freelancer_rating?: number;
}

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
      if (!profile?.id) throw new Error('No profile');
      const data = await callFunction<{ shifts: CompletedShift[] }>('shifts-history', {
        owner_id: profile.id,
        user_type: 'owner',
      });
      setShifts(data.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts history:', err);
      // Mock data for DEV mode
      if (import.meta.env.DEV) {
        setShifts([
          {
            id: 'shift-1',
            freelancer_name: 'Иван Петров',
            freelancer_id: 'freelancer-1',
            freelancer_telegram_username: 'ivan_freelancer',
            location_address: 'ул. Тверская, 5, Москва',
            start_time: '09:00',
            end_time: '18:00',
            hourly_rate: 500,
            date: '2024-07-20',
            status: 'completed',
            total_hours: 9,
            total_cost: 4500,
            freelancer_rating: 4.8,
          },
          {
            id: 'shift-2',
            freelancer_name: 'Мария Сидорова',
            freelancer_id: 'freelancer-2',
            freelancer_telegram_username: 'maria_work',
            location_address: 'ул. Тверская, 5, Москва',
            start_time: '10:00',
            end_time: '19:00',
            hourly_rate: 450,
            date: '2024-07-19',
            status: 'completed',
            total_hours: 9,
            total_cost: 4050,
            freelancer_rating: 4.5,
          },
          {
            id: 'shift-3',
            freelancer_name: 'Алексей Иванов',
            freelancer_id: 'freelancer-3',
            location_address: 'ул. Тверская, 5, Москва',
            start_time: '08:00',
            end_time: '17:00',
            hourly_rate: 550,
            date: '2024-07-18',
            status: 'cancelled',
            total_hours: 0,
            total_cost: 0,
          },
          {
            id: 'shift-4',
            freelancer_name: 'Олег Смирнов',
            freelancer_id: 'freelancer-4',
            freelancer_telegram_username: 'oleg_worker',
            location_address: 'ул. Тверская, 5, Москва',
            start_time: '09:00',
            end_time: '18:00',
            hourly_rate: 500,
            date: '2024-07-17',
            status: 'completed',
            total_hours: 9,
            total_cost: 4500,
            freelancer_rating: 5.0,
          },
        ]);
      }
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
        reviewed_id: selectedShift.freelancer_id,
        rating: rating,
        comment: comment.trim() || undefined,
        reviewed_type: 'freelancer',
      });
      setSelectedShift(null);
      setRating(5);
      setComment('');
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
        <ScreenHeader title="История смен" variant="owner" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="История смен" variant="owner" onBack={onBack} />

      {shifts.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 14 }}>У вас еще нет завершённых смен</div>
        </div>
      ) : (
        <>
          <SectionTitle>Завершённые смены ({shifts.filter(s => s.status === 'completed').length})</SectionTitle>
          {shifts.filter(s => s.status === 'completed').map((shift) => (
            <Card key={shift.id} variant="owner">
              <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 6 }}>
                👤 {shift.freelancer_name}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                {shift.freelancer_rating && (
                  <>⭐ {shift.freelancer_rating.toFixed(1)} • </>
                )}
                📍 {shift.location_address}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                📅 {new Date(shift.date).toLocaleDateString('ru')} • {shift.start_time}-{shift.end_time}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Ставка: {shift.hourly_rate} ₽/час</div>
                  <div className="price owner" style={{ margin: '6px 0' }}>
                    {shift.total_hours}ч × {shift.hourly_rate} = {shift.total_cost} ₽
                  </div>
                </div>
              </div>
              <Button tone="primary" small onClick={() => setSelectedShift(shift)} style={{ marginBottom: 6 }}>
                ⭐ Оценить
              </Button>
              {shift.freelancer_telegram_username && (
                <Button
                  tone="secondary"
                  small
                  onClick={() => window.open(`https://t.me/${shift.freelancer_telegram_username}`, '_blank')}
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
                <Card key={shift.id} variant="owner" style={{ opacity: 0.6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 6 }}>
                    👤 {shift.freelancer_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                    📍 {shift.location_address}
                  </div>
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
        <Modal title="Оценить работника" onClose={() => { setSelectedShift(null); setRating(5); setComment(''); }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              Оценить: <strong>{selectedShift.freelancer_name}</strong>
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
                placeholder="Оставьте отзыв о работе фрилансера..."
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
