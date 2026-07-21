import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, errorText } from '../../lib/api';
import { CreateResumeScreen } from './CreateResumeScreen';
import { Screen, ScreenHeader, Card, Button, Badge, Loading, EmptyState } from '../../components/ui';
import { ResumeGate } from '../../components/ResumeGate';
import { RatingBadge } from '../../components/RatingBadge';

interface Resume {
  id: string;
  status: string;
}

interface Vacancy {
  id: string;
  address: string;
  type: 'temporary' | 'permanent';
  marketplaces: string[];
  payment: number;
  metro_stations: string[];
  schedule?: string;
  /** Владелец вакансии. В таблице owner_vacancies это telegram_id (не owner_telegram_id). */
  telegram_id?: number;
  owner_avg_rating: number | null;
  owner_rating_count: number;
}

export const VacanciesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateResume, setShowCreateResume] = useState(false);

  useEffect(() => {
    if (profile?.telegram_id) {
      loadResume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadResume = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ resume: Resume | null }>('freelancer-resumes', {
        action: 'get',
        telegramId: profile.telegram_id,
      });
      if (data.resume) {
        setResume(data.resume);
        loadVacancies();
      }
    } catch (err) {
      console.error('Failed to load resume:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVacancies = async () => {
    try {
      const data = await callFunction<{ vacancies: Vacancy[] }>('list-vacancies', {
        type: 'permanent',
        city: profile?.city || 'Все',
      });
      setVacancies(data.vacancies || []);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
    }
  };

  const handleApply = async (vacancyId: string, ownerTelegramId?: number) => {
    if (!ownerTelegramId) {
      alert('❌ У вакансии не указан владелец');
      return;
    }
    try {
      await callFunction('job-matches', {
        action: 'create',
        vacancy_id: vacancyId,
        owner_telegram_id: ownerTelegramId,
        freelancer_telegram_id: profile?.telegram_id,
        initiated_by: 'freelancer',
      });
      alert('✅ Отклик отправлен!');
      loadVacancies();
    } catch (err) {
      console.error('Failed to apply:', err);
      alert(`❌ ${errorText(err, 'Ошибка при отправке отклика')}`);
    }
  };

  if (showCreateResume) {
    return (
      <CreateResumeScreen
        onDone={(newResume) => {
          setResume(newResume);
          setShowCreateResume(false);
          loadVacancies();
        }}
        onCancel={() => setShowCreateResume(false)}
      />
    );
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Вакансии" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  if (!resume) {
    return (
      <ResumeGate
        description="Создайте резюме чтобы просматривать вакансии и откликаться"
        onCreate={() => setShowCreateResume(true)}
      />
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Постоянные вакансии" variant="freelancer" onBack={onBack} />

      {vacancies.length === 0 ? (
        <EmptyState>📋 Подходящих вакансий не найдено</EmptyState>
      ) : (
        vacancies.map((vacancy) => (
          <Card key={vacancy.id} variant="freelancer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{vacancy.address}</div>
              <Badge tone="perm-f">📌 Постоянная</Badge>
            </div>
            <div style={{ marginBottom: 8 }}>
              <RatingBadge avgRating={vacancy.owner_avg_rating} count={vacancy.owner_rating_count} />
            </div>

            {vacancy.marketplaces?.length > 0 && <div className="meta">📦 {vacancy.marketplaces.join(', ')}</div>}
            {vacancy.schedule && <div className="meta">📅 График: {vacancy.schedule}</div>}
            {vacancy.metro_stations?.length > 0 && <div className="meta">🚇 {vacancy.metro_stations.join(', ')}</div>}

            <div className="price freelancer" style={{ marginBottom: 10 }}>💰 {vacancy.payment} ₽</div>

            <Button small onClick={() => handleApply(vacancy.id, vacancy.telegram_id)}>
              Откликнуться
            </Button>
          </Card>
        ))
      )}
    </Screen>
  );
};
