import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, errorText } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, Badge, Loading, EmptyState, type BadgeTone } from '../../components/ui';
import { RatingBadge } from '../../components/RatingBadge';

interface Match {
  id: string;
  vacancy_id: string;
  owner_telegram_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  initiated_by: 'freelancer' | 'owner';
  created_at: string;
  responded_at?: string;
  owner_vacancies?: {
    id: string;
    address: string;
    payment: number;
    date?: string;
    start_time?: string;
    end_time?: string;
  };
  profiles?: {
    first_name: string;
    last_name?: string;
    telegram_username?: string;
    avg_rating?: number | null;
    rating_count?: number;
  };
}

const STATUS: Record<string, { tone: BadgeTone; text: string }> = {
  pending: { tone: 'pending', text: 'Ожидает ⏳' },
  accepted: { tone: 'accepted', text: 'Принят ✅' },
  rejected: { tone: 'rejected', text: 'Отклонён ❌' },
};

export const FreelancerMatchesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'sent' | 'offers'>('sent');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ matches: Match[] }>('job-matches', {
        action: 'list-for-freelancer',
      });
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Намеренно перезагружаем только при смене пользователя (telegram_id).
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.telegram_id]);

  const handleAccept = async (matchId: string) => {
    try {
      await callFunction('job-matches', { action: 'accept', id: matchId });
      loadMatches();
    } catch (err) {
      console.error('Failed to accept:', err);
      alert(`❌ ${errorText(err, 'Ошибка при принятии предложения')}`);
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await callFunction('job-matches', { action: 'reject', id: matchId });
      loadMatches();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert(`❌ ${errorText(err, 'Ошибка при отклонении')}`);
    }
  };

  const displayMatches = matches.filter((m) =>
    tab === 'sent' ? m.initiated_by === 'freelancer' : m.initiated_by === 'owner'
  );

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="📬 Мои отклики" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="📬 Мои отклики" variant="freelancer" onBack={onBack} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button tone={tab === 'sent' ? 'primary' : 'secondary'} small onClick={() => setTab('sent')}>
          Мои отклики
        </Button>
        <Button tone={tab === 'offers' ? 'primary' : 'secondary'} small onClick={() => setTab('offers')}>
          Предложения мне
        </Button>
      </div>

      {displayMatches.length === 0 && (
        <EmptyState>{tab === 'sent' ? '📝 Нет откликов' : '📬 Нет предложений'}</EmptyState>
      )}

      {displayMatches.map((match) => {
        const status = STATUS[match.status];
        const tgUsername = match.profiles?.telegram_username;

        return (
          <Card key={match.id} variant="freelancer">
            {status && <Badge tone={status.tone}>{status.text}</Badge>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                📍 {match.owner_vacancies?.address}
              </div>
              <RatingBadge avgRating={match.profiles?.avg_rating ?? null} count={match.profiles?.rating_count ?? 0} />
            </div>

            {match.owner_vacancies?.date && (
              <div className="meta">
                📅 {new Date(match.owner_vacancies.date).toLocaleDateString('ru')}
                {match.owner_vacancies.start_time && `, ${match.owner_vacancies.start_time} — ${match.owner_vacancies.end_time}`}
              </div>
            )}

            <div className="price freelancer" style={{ marginBottom: 10 }}>💰 {match.owner_vacancies?.payment} ₽</div>

            {/* Контакты открываем только после принятия */}
            {match.status === 'accepted' && tgUsername && (
              <a
                href={`https://t.me/${tgUsername.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  background: 'var(--bg-badge-accepted)',
                  borderRadius: 12,
                  padding: 12,
                  textDecoration: 'none',
                  color: 'var(--text-badge-accepted)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                📱 Связаться: @{tgUsername.replace('@', '')}
              </a>
            )}

            {/* Принять/отклонить — только для входящих предложений в ожидании */}
            {tab === 'offers' && match.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button small onClick={() => handleAccept(match.id)}>
                  Принять
                </Button>
                <Button small tone="secondary" onClick={() => handleReject(match.id)}>
                  Отклонить
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </Screen>
  );
};
