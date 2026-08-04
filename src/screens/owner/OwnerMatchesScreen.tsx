import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, errorText } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, Badge, Segmented, Loading, EmptyState, type BadgeTone } from '../../components/ui';
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

// Данные-заглушки для локальной разработки (DEV), когда Edge Functions недоступны.
const MOCK_MATCHES: Match[] = [
  {
    id: 'dev-omatch-1',
    vacancy_id: 'dev-own-vac-1',
    freelancer_telegram_id: 123456789,
    status: 'pending',
    initiated_by: 'freelancer',
    created_at: new Date().toISOString(),
    owner_vacancies: { id: 'dev-own-vac-1', address: 'ул. Тверская, 5', payment: 40000 },
    profiles: { first_name: 'Иван', last_name: 'Петров', telegram_username: 'ivan_work', city: 'Москва' },
  },
  {
    id: 'dev-omatch-2',
    vacancy_id: 'dev-own-vac-2',
    freelancer_telegram_id: 987654321,
    status: 'accepted',
    initiated_by: 'owner',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    responded_at: new Date().toISOString(),
    owner_vacancies: { id: 'dev-own-vac-2', address: 'Невский пр., 100', payment: 3000 },
    profiles: { first_name: 'Мария', last_name: 'Сидорова', telegram_username: 'maria_work', city: 'Москва' },
  },
];

export const OwnerMatchesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'incoming' | 'sent'>('incoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      if (import.meta.env.DEV) {
        setMatches(MOCK_MATCHES);
        setLoading(false);
        return;
      }

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
      alert(`❌ ${errorText(err, 'Ошибка при принятии заявки')}`);
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

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'incoming', label: 'Входящие' },
          { value: 'sent', label: 'Мои предложения' },
        ]}
      />

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
