import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, Badge, Loading, EmptyState, type BadgeTone } from '../../components/ui';
import { RatingBadge } from '../../components/RatingBadge';

interface Match {
  id: string;
  vacancy_id: string;
  freelancer_telegram_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  initiated_by: 'freelancer' | 'owner';
  created_at: string;
  responded_at?: string;
  owner_vacancies?: {
    id: string;
    address: string;
    payment: number;
  };
  profiles?: {
    first_name: string;
    last_name?: string;
    telegram_username?: string;
    city?: string;
    avg_rating?: number | null;
    rating_count?: number;
  };
}

const STATUS: Record<string, { tone: BadgeTone; text: string }> = {
  pending: { tone: 'pending', text: 'Ожидает ⏳' },
  accepted: { tone: 'accepted', text: 'Принят ✅' },
  rejected: { tone: 'rejected', text: 'Отклонён ❌' },
};

export const OwnerMatchesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'incoming' | 'sent'>('incoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ matches: Match[] }>('job-matches', {
        action: 'list-for-owner',
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
      alert('❌ Ошибка при принятии заявки');
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await callFunction('job-matches', { action: 'reject', id: matchId });
      loadMatches();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('❌ Ошибка при отклонении');
    }
  };

  const displayMatches = matches.filter((m) =>
    tab === 'incoming' ? m.initiated_by === 'freelancer' : m.initiated_by === 'owner'
  );

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="📬 Отклики" variant="owner" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="📬 Отклики" variant="owner" onBack={onBack} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="owner" tone={tab === 'incoming' ? 'primary' : 'secondary'} small onClick={() => setTab('incoming')}>
          Входящие
        </Button>
        <Button variant="owner" tone={tab === 'sent' ? 'primary' : 'secondary'} small onClick={() => setTab('sent')}>
          Мои предложения
        </Button>
      </div>

      {displayMatches.length === 0 && (
        <EmptyState>{tab === 'incoming' ? '📝 Нет входящих откликов' : '📬 Нет отправленных предложений'}</EmptyState>
      )}

      {displayMatches.map((match) => {
        const status = STATUS[match.status];
        const tgUsername = match.profiles?.telegram_username;

        return (
          <Card key={match.id} variant="owner">
            {status && <Badge tone={status.tone}>{status.text}</Badge>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {match.profiles?.first_name} {match.profiles?.last_name}
              </div>
              <RatingBadge avgRating={match.profiles?.avg_rating ?? null} count={match.profiles?.rating_count ?? 0} />
            </div>

            <div className="meta">📍 {match.profiles?.city || 'Город не указан'}</div>
            <div className="meta">💼 {match.owner_vacancies?.address}</div>

            <div className="price owner" style={{ marginBottom: 10 }}>💰 {match.owner_vacancies?.payment} ₽</div>

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

            {/* Принять/отклонить — только для входящих откликов в ожидании */}
            {tab === 'incoming' && match.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="owner" small onClick={() => handleAccept(match.id)}>
                  Принять
                </Button>
                <Button variant="owner" small tone="secondary" onClick={() => handleReject(match.id)}>
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
