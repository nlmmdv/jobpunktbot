import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { Screen, ScreenHeader, Loading } from '../../components/ui';
import { CreateResumeScreen, type ExistingResume } from './CreateResumeScreen';

/**
 * Единая точка управления резюме: если его ещё нет — форма создания, если есть —
 * та же форма с заполненными полями. Раньше резюме можно было только создать:
 * после создания изменить ставку, график или метро было негде.
 */
export const MyResumeScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [resume, setResume] = useState<ExistingResume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.telegram_id) return;
    callFunction<{ resume: ExistingResume | null }>('freelancer-resumes', {
      action: 'get',
      telegramId: profile.telegram_id,
    })
      .then((data) => setResume(data.resume))
      .catch((err) => console.error('Failed to load resume:', err))
      .finally(() => setLoading(false));
  }, [profile?.telegram_id]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Моё резюме" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <CreateResumeScreen
      resume={resume}
      onDone={(saved) => setResume({ ...(resume || {}), ...saved } as ExistingResume)}
      onCancel={onBack}
    />
  );
};
