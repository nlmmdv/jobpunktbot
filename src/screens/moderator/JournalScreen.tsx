import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';

interface Entry {
  id: string;
  action: string;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  moderator_name: string | null;
  subject_name: string | null;
}

const ACTIONS: Record<string, { label: string; icon: string; color: string }> = {
  block: { label: 'Блокировка', icon: '🚫', color: '#DC2626' },
  unblock: { label: 'Разблокировка', icon: '✅', color: '#16A34A' },
  cancel_penalty: { label: 'Штраф снят', icon: '↩️', color: '#16A34A' },
  delete_rating: { label: 'Оценка аннулирована', icon: '⭐', color: '#D97706' },
  cancel_shift: { label: 'Смена отменена', icon: '📅', color: '#DC2626' },
};

const when = (v: string) =>
  new Date(v).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Журнал — обратная сторона полного контроля: один человек может заблокировать,
 * снять штраф и аннулировать оценку, поэтому нужна запись, кто и зачем.
 */
export const JournalScreen = ({ onBack }: { onBack: () => void }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ entries: Entry[] }>('moderation-service', {
        action: 'journal',
      });
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Не удалось загрузить журнал:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">📜 Журнал</div>
      <div className="subtitle">Действия модераторов · записей: {entries.length}</div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>❌ {error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          Действий пока не было
        </div>
      )}

      {!loading &&
        !error &&
        entries.map((entry) => {
          const meta = ACTIONS[entry.action] || {
            label: entry.action,
            icon: '•',
            color: 'var(--text-primary)',
          };

          return (
            <div
              key={entry.id}
              style={{
                background: 'var(--bg-card-owner-alt, #F9FAFB)',
                border: '1px solid var(--border-card-owner, #E5E7EB)',
                borderRadius: 10,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                  {meta.icon} {meta.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {when(entry.created_at)}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {entry.moderator_name || 'модератор'}
                {entry.subject_name ? ` → ${entry.subject_name}` : ''}
              </div>

              {entry.reason && (
                <div style={{ fontSize: 11, color: 'var(--text-primary)', marginTop: 4 }}>
                  {entry.reason}
                </div>
              )}
            </div>
          );
        })}
    </Screen>
  );
};
