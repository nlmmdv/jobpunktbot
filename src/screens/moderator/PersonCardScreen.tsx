import { useState, useEffect, useCallback } from 'react';
import { Screen, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';
import { formatWhen } from './PeopleScreen';

interface Penalty {
  id: string;
  penalty: number;
  reason: string | null;
  hours_before: number | null;
  created_at: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  from_name: string | null;
  created_at: string;
}

interface BlockRecord {
  id: string;
  reason: string;
  expires_at: string | null;
  lifted_at: string | null;
  created_at: string;
}

interface Person {
  id: string;
  telegram_id: number;
  full_name: string;
  role: string;
  city?: string;
  phone?: string;
  created_at: string;
}

// Значение — длительность в минутах, 0 = бессрочно.
const DURATIONS = [
  { value: 60, label: '1 час' },
  { value: 24 * 60, label: '1 день' },
  { value: 7 * 24 * 60, label: '1 неделя' },
  { value: 30 * 24 * 60, label: '30 дней' },
  { value: 0, label: 'Навсегда' },
];

const ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  owner: 'Владелец ПВЗ',
  admin: 'Модератор',
};

export const PersonCardScreen = ({
  personId,
  onBack,
}: {
  personId: string;
  onBack: () => void;
}) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [duration, setDuration] = useState(7 * 24 * 60);
  const [blockReason, setBlockReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{
        person: Person;
        penalties: Penalty[];
        ratings: Rating[];
        blocks: BlockRecord[];
      }>('moderation-service', { action: 'person_detail', subjectId: personId });

      setPerson(data.person);
      setPenalties(data.penalties || []);
      setRatings(data.ratings || []);
      setBlocks(data.blocks || []);
    } catch (err) {
      console.error('Не удалось загрузить карточку:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить карточку');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeBlock = blocks.find(
    (b) => !b.lifted_at && (!b.expires_at || new Date(b.expires_at) > new Date())
  );

  const confirmBlock = async () => {
    const reason = blockReason.trim();
    if (!reason) {
      alert('Укажите причину блокировки');
      return;
    }

    setBusy(true);
    try {
      await callFunction('moderation-service', {
        action: 'block',
        subjectId: personId,
        durationMinutes: duration,
        reason,
      });
      setShowBlockModal(false);
      setBlockReason('');
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось заблокировать'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUnblock = async () => {
    if (!confirm(`Снять блокировку с ${person?.full_name}?`)) return;
    setBusy(true);
    try {
      await callFunction('moderation-service', { action: 'unblock', subjectId: personId });
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось разблокировать'}`);
    } finally {
      setBusy(false);
    }
  };

  const cancelPenalty = async (penalty: Penalty) => {
    const reason = prompt(`Почему снимаем штраф ${penalty.penalty}?`);
    if (!reason?.trim()) return;

    setBusy(true);
    try {
      await callFunction('moderation-service', {
        action: 'cancel_penalty',
        subjectId: personId,
        penaltyId: penalty.id,
        reason: reason.trim(),
      });
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось снять штраф'}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteRating = async (rating: Rating) => {
    const reason = prompt(`Почему аннулируем оценку ${rating.rating}⭐?`);
    if (!reason?.trim()) return;

    setBusy(true);
    try {
      await callFunction('moderation-service', {
        action: 'delete_rating',
        subjectId: personId,
        ratingId: rating.id,
        reason: reason.trim(),
      });
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось аннулировать оценку'}`);
    } finally {
      setBusy(false);
    }
  };

  const btn = {
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  } as const;

  const section = { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 8px' } as const;
  const card = {
    background: 'var(--bg-card-owner-alt, #F9FAFB)',
    border: '1px solid var(--border-card-owner, #E5E7EB)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  } as const;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>❌ {error}</div>
      )}

      {!loading && !error && person && (
        <>
          <div className="title">{person.full_name || 'Без имени'}</div>
          <div className="subtitle">
            {ROLE_LABELS[person.role] || person.role} · ID {person.telegram_id}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {person.city || 'город не указан'} · {person.phone || 'телефон не указан'} · с{' '}
            {formatWhen(person.created_at)}
          </div>

          {activeBlock ? (
            <div
              style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                padding: 12,
                margin: '16px 0',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>🚫 Аккаунт заблокирован</div>
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>
                {activeBlock.reason}
              </div>
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
                {activeBlock.expires_at ? `До ${formatWhen(activeBlock.expires_at)}` : 'Бессрочно'}
              </div>
              <button
                onClick={handleUnblock}
                disabled={busy}
                style={{ ...btn, background: '#DCFCE7', color: '#16A34A', marginTop: 10 }}
              >
                ✅ Разблокировать
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBlockModal(true)}
              disabled={busy || person.role === 'admin'}
              style={{
                ...btn,
                background: '#FEE2E2',
                color: '#DC2626',
                margin: '16px 0',
                opacity: person.role === 'admin' ? 0.5 : 1,
              }}
            >
              🚫 Заблокировать аккаунт
            </button>
          )}

          <div style={section}>Штрафы за отмену смен ({penalties.length})</div>
          {penalties.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Штрафов нет</div>
          ) : (
            penalties.map((p) => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>{p.penalty}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {p.reason || 'без причины'} · {formatWhen(p.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => cancelPenalty(p)}
                    disabled={busy}
                    style={{ ...btn, background: '#DCFCE7', color: '#16A34A' }}
                  >
                    Снять
                  </button>
                </div>
              </div>
            ))
          )}

          <div style={section}>Полученные оценки ({ratings.length})</div>
          {ratings.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Оценок нет</div>
          ) : (
            ratings.map((r) => (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: r.rating <= 2 ? '#DC2626' : 'var(--text-primary)' }}>
                      {'⭐'.repeat(r.rating)} {r.rating}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      От: {r.from_name || 'неизвестно'} · {formatWhen(r.created_at)}
                    </div>
                    {r.comment && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
                        «{r.comment}»
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRating(r)}
                    disabled={busy}
                    style={{ ...btn, background: '#FEE2E2', color: '#DC2626' }}
                  >
                    Аннулировать
                  </button>
                </div>
              </div>
            ))
          )}

          {blocks.length > 0 && (
            <>
              <div style={section}>История блокировок</div>
              {blocks.map((b) => (
                <div key={b.id} style={{ ...card, opacity: b.lifted_at ? 0.6 : 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{b.reason}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatWhen(b.created_at)} ·{' '}
                    {b.lifted_at
                      ? `снята ${formatWhen(b.lifted_at)}`
                      : b.expires_at
                      ? `до ${formatWhen(b.expires_at)}`
                      : 'бессрочно'}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {showBlockModal && person && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowBlockModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
              🚫 Блокировка аккаунта
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {person.full_name} · {ROLE_LABELS[person.role] || person.role}
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              На какой срок
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-card-owner, #E5E7EB)',
                fontSize: 12,
                fontFamily: 'inherit',
                marginBottom: 14,
              }}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Причина
            </label>
            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Например: сорвал три смены подряд"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-card-owner, #E5E7EB)',
                fontSize: 12,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Человек увидит причину и срок вместо приложения.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmBlock}
                disabled={busy}
                style={{ ...btn, flex: 1, padding: 10, background: '#DC2626', color: 'white' }}
              >
                {busy ? 'Сохраняем...' : 'Заблокировать'}
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
                style={{
                  ...btn,
                  flex: 1,
                  padding: 10,
                  background: 'white',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-card-owner, #E5E7EB)',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
};
