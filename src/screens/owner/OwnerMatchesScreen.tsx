import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';

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
    title: string;
    address: string;
    payment: number;
  };
  profiles?: {
    first_name: string;
    last_name?: string;
    telegram_username?: string;
    city?: string;
  };
}

export const OwnerMatchesScreen = () => {
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
      await callFunction('job-matches', {
        action: 'accept',
        id: matchId,
      });
      loadMatches();
    } catch (err) {
      console.error('Failed to accept:', err);
      alert('❌ Ошибка при принятии заявки');
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await callFunction('job-matches', {
        action: 'reject',
        id: matchId,
      });
      loadMatches();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('❌ Ошибка при отклонении');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FFF7ED', color: '#D97706', text: 'Ожидает ⏳' };
      case 'accepted':
        return { bg: '#DCFCE7', color: '#16A34A', text: 'Принят ✅' };
      case 'rejected':
        return { bg: '#FDECEC', color: '#DC2626', text: 'Отклонён ❌' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: status };
    }
  };

  const incomingMatches = matches.filter(m => m.initiated_by === 'freelancer');
  const sentMatches = matches.filter(m => m.initiated_by === 'owner');

  const displayMatches = tab === 'incoming' ? incomingMatches : sentMatches;

  if (loading) {
    return (
      <div style={{ padding: '20px 18px', minHeight: '100vh', background: '#fff' }}>
        <div style={{ textAlign: 'center', color: '#8B8798' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>📬 Отклики</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setTab('incoming')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            background: tab === 'incoming' ? '#2563EB' : '#F5F8FE',
            color: tab === 'incoming' ? '#fff' : '#2563EB',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Входящие
        </button>
        <button
          onClick={() => setTab('sent')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            background: tab === 'sent' ? '#2563EB' : '#F5F8FE',
            color: tab === 'sent' ? '#fff' : '#2563EB',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Отправленные
        </button>
      </div>

      {/* Empty State */}
      {displayMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798' }}>
          {tab === 'incoming' ? '📝 Нет откликов' : '📬 Нет отправленных предложений'}
        </div>
      )}

      {/* Matches List */}
      {displayMatches.map((match) => {
        const statusBadge = getStatusBadge(match.status);
        const freelancerName = match.profiles ? `${match.profiles.first_name} ${match.profiles.last_name || ''}`.trim() : 'Unknown';
        const tgUsername = match.profiles?.telegram_username;

        return (
          <div
            key={match.id}
            style={{
              background: '#F5F8FE',
              border: '1px solid #E1EBFB',
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#17151F', marginBottom: 8 }}>
              {freelancerName}
            </div>

            <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 6 }}>
              📍 {match.profiles?.city || 'Город не указан'}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#17151F', marginBottom: 6 }}>
              {match.owner_vacancies?.title}
            </div>

            <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 10 }}>
              💰 {match.owner_vacancies?.payment}₽
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: 'inline-block',
                background: statusBadge.bg,
                color: statusBadge.color,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {statusBadge.text}
            </div>

            {/* Contact Info - Only show when accepted */}
            {match.status === 'accepted' && tgUsername && (
              <div style={{ marginTop: 10 }}>
                <a
                  href={`https://t.me/${tgUsername.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 12,
                    padding: 12,
                    textDecoration: 'none',
                    color: '#16A34A',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  📱 Telegram: @{tgUsername.replace('@', '')}
                </a>
              </div>
            )}

            {/* Action Buttons - Only for incoming tab with pending status */}
            {tab === 'incoming' && match.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => handleAccept(match.id)}
                  style={{
                    flex: 1,
                    padding: 10,
                    border: 'none',
                    borderRadius: 10,
                    background: '#2563EB',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Принять
                </button>
                <button
                  onClick={() => handleReject(match.id)}
                  style={{
                    flex: 1,
                    padding: 10,
                    border: '1px solid #E1EBFB',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#6E6A7C',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Отклонить
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
