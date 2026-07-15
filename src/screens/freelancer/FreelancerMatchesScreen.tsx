import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';

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
    title: string;
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
  };
}

export const FreelancerMatchesScreen = () => {
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
    loadMatches();
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
      alert('❌ Ошибка при принятии предложения');
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

  const sentMatches = matches.filter(m => m.initiated_by === 'freelancer');
  const offerMatches = matches.filter(m => m.initiated_by === 'owner');

  const displayMatches = tab === 'sent' ? sentMatches : offerMatches;

  if (loading) {
    return (
      <div style={{ padding: '20px 18px', minHeight: '100vh', background: '#fff' }}>
        <div style={{ textAlign: 'center', color: '#8B8798' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>📬 Мои отклики</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setTab('sent')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            background: tab === 'sent' ? '#6D28D9' : '#F7F6FB',
            color: tab === 'sent' ? '#fff' : '#6D28D9',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Мои отклики
        </button>
        <button
          onClick={() => setTab('offers')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            background: tab === 'offers' ? '#6D28D9' : '#F7F6FB',
            color: tab === 'offers' ? '#fff' : '#6D28D9',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Предложения мне
        </button>
      </div>

      {/* Empty State */}
      {displayMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798' }}>
          {tab === 'sent' ? '📝 Нет откликов' : '📬 Нет предложений'}
        </div>
      )}

      {/* Matches List */}
      {displayMatches.map((match) => {
        const statusBadge = getStatusBadge(match.status);
        const tgUsername = match.profiles?.telegram_username;

        return (
          <div
            key={match.id}
            style={{
              background: '#F7F6FB',
              border: '1px solid #ECEAF4',
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#17151F', marginBottom: 8 }}>
              {match.owner_vacancies?.title}
            </div>

            <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 6 }}>
              📍 {match.owner_vacancies?.address}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#17151F', marginBottom: 10 }}>
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
                  📱 Связаться: @{tgUsername.replace('@', '')}
                </a>
              </div>
            )}

            {/* Action Buttons - Only for offer tab with pending status */}
            {tab === 'offers' && match.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => handleAccept(match.id)}
                  style={{
                    flex: 1,
                    padding: 10,
                    border: 'none',
                    borderRadius: 10,
                    background: '#6D28D9',
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
                    border: '1px solid #ECEAF4',
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
