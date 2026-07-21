import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, errorText } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, Badge, SectionTitle, Loading, EmptyState } from '../../components/ui';
import { CancelShiftModal } from '../../components/CancelShiftModal';
import { formatShiftWhen } from '../../lib/cancellation';

interface ShiftMatch {
  id: string;
  status: string;
  confirmed_at: string | null;
  owner_vacancies?: {
    address?: string;
    payment?: number;
    marketplaces?: string[];
    date?: string;
    start_time?: string;
    end_time?: string;
  };
}

/** Дата смены уже прошла? Сравниваем по московскому дню — смены заведены в нём. */
const todayMoscow = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const FreelancerMyShiftsScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<ShiftMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<ShiftMatch | null>(null);
  const [busy, setBusy] = useState(false);

  const loadShifts = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ matches: ShiftMatch[] }>('job-matches', {
        action: 'list-shifts',
        role: 'freelancer',
      });
      setShifts(data.matches || []);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.telegram_id]);

  const handleCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const res = await callFunction<{ penalty: number; reason: string }>('cancel-match', {
        match_id: cancelling.id,
      });
      setCancelling(null);
      alert(res.penalty === 0 ? '✅ Смена отменена без штрафа' : `Смена отменена. Штраф: ${res.penalty} к рейтингу`);
      await loadShifts();
    } catch (err) {
      console.error('Failed to cancel shift:', err);
      alert(`❌ ${errorText(err, 'Не удалось отменить смену')}`);
    } finally {
      setBusy(false);
    }
  };

  const today = todayMoscow();
  const upcoming = shifts.filter((s) => (s.owner_vacancies?.date || '') >= today);
  const past = shifts.filter((s) => (s.owner_vacancies?.date || '') < today);

  const renderCard = (shift: ShiftMatch, isPast: boolean) => {
    const v = shift.owner_vacancies || {};
    return (
      <Card key={shift.id} variant="freelancer">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          📍 {v.address || 'Адрес не указан'}
        </div>
        <div className="meta">📅 {formatShiftWhen(v.date, v.start_time, v.end_time)}</div>
        {v.marketplaces?.length ? <div className="meta">📦 {v.marketplaces.join(', ')}</div> : null}
        <div className="price freelancer" style={{ marginBottom: 8 }}>💰 {v.payment ?? '—'} ₽</div>

        <Badge tone={shift.confirmed_at ? 'accepted' : 'pending'}>
          {shift.confirmed_at ? '✅ Подтверждена' : '⏳ Ожидает подтверждения'}
        </Badge>

        {!isPast && (
          <Button tone="danger" small onClick={() => setCancelling(shift)} style={{ marginTop: 8 }}>
            ❌ Отменить смену
          </Button>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="📅 Мои смены" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="📅 Мои смены" variant="freelancer" onBack={onBack} />

      {shifts.length === 0 && <EmptyState>У вас нет подтверждённых смен</EmptyState>}

      {upcoming.length > 0 && (
        <>
          <SectionTitle>Предстоящие</SectionTitle>
          {upcoming.map((s) => renderCard(s, false))}
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>Прошедшие</SectionTitle>
          {past.map((s) => renderCard(s, true))}
        </>
      )}

      {cancelling && (
        <CancelShiftModal
          role="freelancer"
          variant="freelancer"
          address={cancelling.owner_vacancies?.address}
          date={cancelling.owner_vacancies?.date}
          startTime={cancelling.owner_vacancies?.start_time}
          endTime={cancelling.owner_vacancies?.end_time}
          busy={busy}
          onConfirm={handleCancel}
          onClose={() => setCancelling(null)}
        />
      )}
    </Screen>
  );
};
