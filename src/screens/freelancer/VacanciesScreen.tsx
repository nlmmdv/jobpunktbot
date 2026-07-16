import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { CreateResumeScreen } from './CreateResumeScreen';

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

export const VacanciesScreen = () => {
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

  if (loading) {
    return (
      <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>Загрузка...</div>
      </div>
    );
  }

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

  if (!resume) {
    return (
      <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 8 }}>Создайте резюме</div>
          <div style={{ fontSize: 14, color: '#8B8798', marginBottom: 24 }}>Создайте резюме чтобы просматривать вакансии и откликаться</div>
          <button
            onClick={() => setShowCreateResume(true)}
            style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: 'pointer' }}
          >
            Создать резюме
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Постоянные вакансии</div>

      {vacancies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>
          📋 Подходящих вакансий не найдено
        </div>
      ) : (
        <div>
          {vacancies.map((vacancy) => (
            <div
              key={vacancy.id}
              style={{
                background: '#F7F6FB',
                border: '1px solid #ECEAF4',
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                boxShadow: '0 2px 10px rgba(23,21,31,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#17151F' }}>{vacancy.address}</div>
                <span style={{ background: '#EDE4FB', color: '#7C3AED', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                  📌 Постоянная
                </span>
              </div>

              {vacancy.marketplaces && vacancy.marketplaces.length > 0 && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 8 }}>
                  📦 {vacancy.marketplaces.join(', ')}
                </div>
              )}

              {vacancy.schedule && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 8 }}>
                  📅 График: {vacancy.schedule}
                </div>
              )}

              {vacancy.metro_stations && vacancy.metro_stations.length > 0 && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 8 }}>
                  🚇 {vacancy.metro_stations.join(', ')}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: '#17151F', marginBottom: 12 }}>
                💰 {vacancy.payment}₽
              </div>

              <button
                onClick={() => handleApply(vacancy.id, vacancy.telegram_id)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: 'none',
                  borderRadius: 10,
                  background: '#6D28D9',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(109,40,217,0.2)',
                }}
              >
                Откликнуться
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
