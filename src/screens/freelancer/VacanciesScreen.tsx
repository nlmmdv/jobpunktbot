import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { CreateResumeScreen } from './CreateResumeScreen';
import { Screen, ScreenHeader, Card, Button, Badge, Loading, EmptyState } from '../../components/ui';
import { ResumeGate } from '../../components/ResumeGate';
import { ComplaintModal } from '../../components/ComplaintModal';

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
}

export const VacanciesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateResume, setShowCreateResume] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

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
      const errorMsg = err instanceof Error ? err.message : 'неизвестная ошибка';
      if (errorMsg.includes('Уже существует')) {
        alert('❌ Вы уже откликнулись на эту вакансию');
      } else if (errorMsg.includes('initData')) {
        alert('❌ Сеанс истёк. Пожалуйста, перезагрузите приложение');
      } else {
        alert(`❌ Ошибка при отправке отклика: ${errorMsg}`);
      }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{vacancy.address}</div>
              <Badge tone="perm-f">📌 Постоянная</Badge>
            </div>

            {vacancy.marketplaces?.length > 0 && <div className="meta">📦 {vacancy.marketplaces.join(', ')}</div>}
            {vacancy.schedule && <div className="meta">📅 График: {vacancy.schedule}</div>}
            {vacancy.metro_stations?.length > 0 && <div className="meta">🚇 {vacancy.metro_stations.join(', ')}</div>}

            <div className="price freelancer" style={{ marginBottom: 10 }}>💰 {vacancy.payment} ₽</div>

            <div style={{ display: 'flex', gap: 6 }}>
              <Button small onClick={() => handleApply(vacancy.id, vacancy.telegram_id)} style={{ flex: 1 }}>
                Откликнуться
              </Button>
              <button
                onClick={() => {
                  // Используем telegram_id как ID компании для жалоб
                  setSelectedCompanyId(String(vacancy.telegram_id || ''));
                  setSelectedCompanyName('ПВЗ ' + vacancy.address);
                  setComplaintModalOpen(true);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: 'white',
                  color: '#6366F1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Пожаловаться на компанию"
              >
                🚩
              </button>
            </div>
          </Card>
        ))
      )}

      <ComplaintModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        complaintType="company"
        targetId={selectedCompanyId}
        targetName={selectedCompanyName}
      />
    </Screen>
  );
};
